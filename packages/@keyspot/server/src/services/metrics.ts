import { prisma } from '../utils/prisma.js';
import { Tier } from '@prisma/client';

export interface UsageMetric {
  bucket: string;
  requests: number;
  errors: number;
  avgLatency: number;
}

export interface UsageSummary {
  totalRequests: number;
  totalErrors: number;
  avgLatency: number;
  breakdowns: {
    byEndpoint: Record<string, number>;
    byStatusCode: Record<string, number>;
  };
  timeSeries: UsageMetric[];
}

export async function getUsageMetrics(
  userId: string,
  period: '24h' | '7d' | '30d' | '90d' = '7d',
  groupBy: 'hour' | 'day' = 'day',
  apiKeyId?: string
): Promise<UsageSummary> {
  const intervalSeconds: Record<string, number> = {
    '24h': 24 * 60 * 60,
    '7d': 7 * 24 * 60 * 60,
    '30d': 30 * 24 * 60 * 60,
    '90d': 90 * 24 * 60 * 60,
  };

  const now = new Date();
  const since = new Date(now.getTime() - (intervalSeconds[period] || 7 * 24 * 60 * 60) * 1000);

  const where: any = {
    userId,
    timestamp: { gte: since },
  };

  if (apiKeyId) where.apiKeyId = apiKeyId;

  const [totalRequests, timeSeries] = await Promise.all([
    prisma.usageEvent.count({ where }),
    getTimeSeries(userId, since, groupBy, apiKeyId),
  ]);

  const [errorCount, latencyAgg] = await Promise.all([
    prisma.usageEvent.count({ where: { ...where, statusCode: { gte: 400 } } }),
    prisma.usageEvent.aggregate({ where, _avg: { latencyMs: true } }),
  ]);

  const endpointBreakdown = await prisma.usageEvent.groupBy({
    by: ['endpoint'],
    where,
    _count: true,
    orderBy: { _count: { endpoint: 'desc' } },
    take: 20,
  });

  const statusBreakdown = await prisma.usageEvent.groupBy({
    by: ['statusCode'],
    where,
    _count: true,
  });

  const byEndpoint: Record<string, number> = {};
  for (const r of endpointBreakdown) {
    byEndpoint[r.endpoint] = r._count;
  }

  const byStatusCode: Record<string, number> = {};
  for (const r of statusBreakdown) {
    byStatusCode[String(r.statusCode)] = r._count;
  }

  return {
    totalRequests,
    totalErrors: errorCount,
    avgLatency: latencyAgg._avg.latencyMs ?? 0,
    breakdowns: { byEndpoint, byStatusCode },
    timeSeries,
  };
}

async function getTimeSeries(
  userId: string,
  since: Date,
  groupBy: 'hour' | 'day',
  apiKeyId?: string
): Promise<UsageMetric[]> {
  const where: any = { userId, timestamp: { gte: since } };
  if (apiKeyId) where.apiKeyId = apiKeyId;

  const allEvents = await prisma.usageEvent.findMany({
    where,
    select: { timestamp: true, statusCode: true, latencyMs: true },
    orderBy: { timestamp: 'asc' },
  });

  const bucketMap = new Map<string, { requests: number; errors: number; totalLatency: number }>();

  for (const event of allEvents) {
    const d = new Date(event.timestamp);
    let bucket: string;
    if (groupBy === 'hour') {
      bucket = `${d.toISOString().slice(0, 13)}:00`;
    } else {
      bucket = d.toISOString().slice(0, 10);
    }

    const existing = bucketMap.get(bucket) || { requests: 0, errors: 0, totalLatency: 0 };
    existing.requests++;
    if (event.statusCode >= 400) existing.errors++;
    existing.totalLatency += event.latencyMs;
    bucketMap.set(bucket, existing);
  }

  return Array.from(bucketMap.entries()).map(([bucket, data]) => ({
    bucket,
    requests: data.requests,
    errors: data.errors,
    avgLatency: data.requests > 0 ? Math.round(data.totalLatency / data.requests) : 0,
  }));
}

export async function getUsageQuotas(userId: string): Promise<{
  keyCount: number;
  maxKeys: number;
  requestsThisMonth: number;
  maxRequests: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true, _count: { select: { apiKeys: { where: { revokedAt: null } } } } },
  });

  if (!user) throw new Error('User not found');

  const tier = user.subscription?.tier || Tier.FREE;

  const limits: Record<string, { maxKeys: number; requestsPerMonth: number }> = {
    [Tier.FREE]: { maxKeys: 3, requestsPerMonth: 10_000 },
    [Tier.PRO]: { maxKeys: 25, requestsPerMonth: 1_000_000 },
    [Tier.ENTERPRISE]: { maxKeys: 100, requestsPerMonth: 10_000_000 },
  };

  const limit = limits[tier] || limits[Tier.FREE];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const requestsThisMonth = await prisma.usageEvent.count({
    where: { userId, timestamp: { gte: startOfMonth } },
  });

  return {
    keyCount: user._count.apiKeys,
    maxKeys: limit!.maxKeys,
    requestsThisMonth,
    maxRequests: limit!.requestsPerMonth,
  };
}

export async function recordUsageEvent(data: {
  userId: string;
  apiKeyId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId: data.userId,
      apiKeyId: data.apiKeyId || null,
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      latencyMs: data.latencyMs,
      metadata: data.metadata as any,
    },
  });
}
