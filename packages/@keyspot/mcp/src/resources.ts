import type { KeySpot } from '@roadsidelab/keyspot-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerResources(server: McpServer, guard: KeySpot): void {
  server.resource(
    'keyspot-config',
    'keyspot://config',
    {
      description: 'Current KeySpot configuration including vault type, prune strategy, and feature flags',
      mimeType: 'application/json',
    },
    async (uri) => {
      const vault = guard.getVault();
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            vaultType: vault.constructor.name,
            taintEnabled: true,
            pruneStrategy: 'vault_with_taint',
            promptShieldEnabled: true,
          }, null, 2),
        }],
      };
    },
  );

  server.resource(
    'keyspot-stats',
    'keyspot://stats',
    {
      description: 'Runtime statistics for the KeySpot instance',
      mimeType: 'application/json',
    },
    async (uri) => {
      const audit = guard.getAuditLogger();
      const entries = audit.getEntries();
      const scanCount = entries.filter((e: any) => String(e.event?.type ?? '').includes('scan')).length;
      const secretCount = entries.filter((e: any) =>
        ['secret_vaulted', 'secret_redacted', 'secret_removed', 'secret_replaced'].includes(String(e.event?.type ?? ''))
      ).length;
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            totalAuditEntries: entries.length,
            totalScans: scanCount,
            totalSecretsFound: secretCount,
          }, null, 2),
        }],
      };
    },
  );

  server.resource(
    'keyspot-audit-recent',
    'keyspot://audit/recent',
    {
      description: 'The 20 most recent audit log entries',
      mimeType: 'application/json',
    },
    async (uri) => {
      const audit = guard.getAuditLogger();
      const recent = audit.getEntries().slice(-20);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(recent, null, 2),
        }],
      };
    },
  );
}
