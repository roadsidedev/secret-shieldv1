import { z } from 'zod';
import type { KeySpot } from '@roadsidelab/keyspot-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ── Input Schemas (exported for programmatic use) ────────────────

export const ScanTextSchema = z.object({
  content: z.string().describe('Text content to scan for secrets'),
  context: z.string().optional().describe('Optional path context for contextual scoring'),
});

export const ScanObjectSchema = z.object({
  state: z.record(z.unknown()).describe('JSON object or state to scan for secrets'),
  deepScan: z.boolean().optional().describe('Enable deep scanning into nested objects'),
});

export const CheckpointSchema = z.object({
  state: z.record(z.unknown()).describe('Agent state to checkpoint'),
  pruneStrategy: z.enum(['vault_with_taint', 'redact', 'remove', 'replace']).optional().describe('Strategy for handling detected secrets'),
});

export const ValidatePromptSchema = z.object({
  prompt: z.string().describe('Prompt text to check for jailbreak or policy violations'),
});

export const StreamScanSchema = z.object({
  tokens: z.string().describe('Token stream content to scan for secrets'),
  context: z.string().optional().describe('Optional path context for contextual scoring'),
});

export const AuditLogSchema = z.object({
  limit: z.number().min(1).max(500).optional().default(50).describe('Maximum number of audit log entries to return'),
});

function stripRawFromMatches(matches: unknown[]): unknown[] {
  return matches.map((m) => {
    if (m && typeof m === 'object') {
      const { rawValue: _r, ...rest } = m as Record<string, unknown>;
      return rest;
    }
    return m;
  });
}

// ── Tool Handlers ───────────────────────────────────────────────

export function registerTools(server: McpServer, guard: KeySpot, startTime: number): void {
  server.tool(
    'scan_text',
    'Scan a string of text for exposed secrets, API keys, credentials, or PII',
    { content: z.string(), context: z.string().optional() },
    async ({ content, context }) => {
      const matches = await guard.scan({ content, _context: context ?? 'input' });
      return {
        content: [{ type: 'text', text: JSON.stringify(stripRawFromMatches(matches), null, 2) }],
      };
    },
  );

  server.tool(
    'scan_object',
    'Scan a JSON object or state tree for exposed secrets',
    { state: z.record(z.unknown()), deepScan: z.boolean().optional() },
    async ({ state, deepScan }) => {
      const scanState = deepScan ? { ...state, __keyspotDeep: true } : state;
      const matches = await guard.scan(scanState);
      return {
        content: [{ type: 'text', text: JSON.stringify(stripRawFromMatches(matches), null, 2) }],
      };
    },
  );

  server.tool(
    'checkpoint',
    'Run a full checkpoint cycle: scan state for secrets, vault them, and return sanitized state',
    { state: z.record(z.unknown()), pruneStrategy: z.string().optional() },
    async ({ state, pruneStrategy }) => {
      const checkState = pruneStrategy ? { ...state, __keyspotPrune: pruneStrategy } : state;
      const cleanState = await guard.checkpoint(checkState);
      return {
        content: [{ type: 'text', text: JSON.stringify(cleanState, null, 2) }],
      };
    },
  );

  server.tool(
    'validate_prompt',
    'Check a prompt for jailbreak attempts, system prompt extraction, and policy violations',
    { prompt: z.string() },
    async ({ prompt }) => {
      const result = await guard.validatePrompt(prompt);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    'stream_scan',
    'Scan streaming token content for secrets using a rolling window',
    { tokens: z.string(), context: z.string().optional() },
    async ({ tokens, context }) => {
      const matches = await guard.stream(tokens, context ?? '');
      return {
        content: [{ type: 'text', text: JSON.stringify(stripRawFromMatches(matches), null, 2) }],
      };
    },
  );

  server.tool(
    'audit_log',
    'Retrieve recent audit log entries from the hash-chained audit log',
    { limit: z.number().min(1).max(500).optional().default(50) },
    async ({ limit }) => {
      const logger = guard.getAuditLogger();
      const all = logger.getEntries();
      const entries = all.slice(-limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }],
      };
    },
  );

  server.tool(
    'health',
    'Check the KeySpot MCP server health, version, and uptime',
    {},
    async () => {
      const uptime = Date.now() - startTime;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'ok',
            version: '0.0.5',
            uptimeMs: uptime,
            uptime: `${Math.floor(uptime / 1000)}s`,
          }, null, 2),
        }],
      };
    },
  );
}
