import { Router, type Request, type Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createKeySpotMcpServer } from '@roadsidelab/keyspot-mcp';
import type { KeySpot } from '@roadsidelab/keyspot-core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSubscription } from '../middleware/requireSubscription.js';

const transports = new Map<string, SSEServerTransport>();

let mcpServer: McpServer | null = null;

function getOrCreateServer(guard: KeySpot): McpServer {
  if (!mcpServer) {
    const result = createKeySpotMcpServer({ guard });
    mcpServer = result.server;
  }
  return mcpServer;
}

export function createMcpRouter(guard: KeySpot): Router {
  const router = Router();

  // MCP requires authenticated subscriber — never public
  router.use(requireAuth, requireSubscription('FREE'));

  router.get('/sse', async (_req: Request, res: Response) => {
    const server = getOrCreateServer(guard);

    const transport = new SSEServerTransport('/mcp/messages', res);
    transports.set(transport.sessionId, transport);

    res.on('close', () => {
      transports.delete(transport.sessionId);
    });

    await server.connect(transport);
  });

  router.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: 'No active MCP session found for this sessionId' });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  return router;
}

export default createMcpRouter;
