import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'scan-for-secrets',
    'Template for scanning content or state for secrets before saving it',
    {
      content: z.string().describe('The content or state to scan for secrets'),
    },
    async ({ content }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Scan the following content for secrets (API keys, tokens, credentials, PII) using KeySpot's security scanner. Report any matches found:\n\n${content}`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'validate-prompt-safety',
    'Template for checking if a prompt is safe to send to an LLM',
    {
      prompt: z.string().describe('The prompt to validate'),
    },
    async ({ prompt: promptText }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Check this prompt for jailbreak attempts, system prompt extraction, and policy violations using KeySpot's PromptShield:\n\n${promptText}`,
          },
        },
      ],
    }),
  );
}
