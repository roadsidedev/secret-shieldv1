#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { KeySpot, KeySpotConfig } from '@roadsidelab/keyspot-core';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';

// ── Default Config from Environment ─────────────────────────────

function loadConfigFromEnv(): KeySpotConfig {
  const config: KeySpotConfig = {};

  if (process.env.KEYSPOT_TAINT_ENABLED === 'false') {
    config.taintEnabled = false;
  }

  if (process.env.KEYSPOT_PROMPT_SHIELD === 'false') {
    config.promptShield = { enabled: false };
  } else {
    config.promptShield = { enabled: true };
  }

  if (process.env.KEYSPOT_DEEP_SCAN === 'true') {
    config.deepScan = true;
  }

  return config;
}

// ── Create Server ───────────────────────────────────────────────

export function createKeySpotMcpServer(options?: {
  config?: KeySpotConfig;
  guard?: KeySpot;
  serverName?: string;
  serverVersion?: string;
}): { server: McpServer; guard: KeySpot } {
  const guard = options?.guard ?? new KeySpot(options?.config ?? loadConfigFromEnv());
  const startTime = Date.now();

  const server = new McpServer({
    name: options?.serverName ?? 'keyspot',
    version: options?.serverVersion ?? '0.0.5',
  });

  registerPrompts(server);
  registerResources(server, guard);
  registerTools(server, guard, startTime);

  return { server, guard };
}

// ── Entry Point ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const { server } = createKeySpotMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run as CLI when executed directly
const isMainModule = process.argv[1]?.endsWith('keyspot-mcp') ||
  process.argv[1]?.endsWith('keyspot-mcp.js') ||
  process.argv[1]?.endsWith('index.js');

if (isMainModule) {
  main().catch((err: unknown) => {
    console.error('KeySpot MCP server failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
