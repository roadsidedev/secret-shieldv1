import { KeySpot } from '@roadsidelab/keyspot-core';

type AnthropicMessageCreateParams = {
  messages: Array<{ role: string; content: string | Array<any> }>;
  system?: string | Array<any>;
  [key: string]: any;
};

type AnthropicMessageResult = {
  content: Array<{ type: string; text?: string; [key: string]: any }>;
  [key: string]: any;
};

async function checkpointText(guard: KeySpot, text: string): Promise<string> {
  const clean = await guard.checkpoint({ text });
  return typeof clean.text === 'string' ? clean.text : text;
}

/**
 * Creates an Anthropic SDK client wrapper that scans inputs and responses.
 *
 * Usage:
 *   const guarded = wrapAnthropic(anthropic, guard);
 *   const msg = await guarded.messages.create({ ... });
 */
export function wrapAnthropic<T extends { messages: { create: (params: any) => Promise<any> } }>(
  client: T,
  guard: KeySpot,
): T {
  const originalCreate = client.messages.create.bind(client.messages);

  (client.messages as any).create = async (params: AnthropicMessageCreateParams) => {
    // Inbound: system + user messages
    let system = params.system;
    if (typeof system === 'string') {
      system = await checkpointText(guard, system);
    }

    const messages = await Promise.all(
      (params.messages || []).map(async (msg) => {
        if (typeof msg.content === 'string') {
          return { ...msg, content: await checkpointText(guard, msg.content) };
        }
        if (Array.isArray(msg.content)) {
          const content = await Promise.all(
            msg.content.map(async (block: any) => {
              if (block?.type === 'text' && typeof block.text === 'string') {
                return { ...block, text: await checkpointText(guard, block.text) };
              }
              if (block?.type === 'tool_result' && typeof block.content === 'string') {
                return { ...block, content: await checkpointText(guard, block.content) };
              }
              return block;
            }),
          );
          return { ...msg, content };
        }
        return msg;
      }),
    );

    const result: AnthropicMessageResult = await originalCreate({
      ...params,
      system,
      messages,
    });

    const scannedContent = await Promise.all(
      result.content.map(async (block) => {
        if (block.type === 'text' && block.text) {
          return { ...block, text: await checkpointText(guard, block.text) };
        }
        return block;
      }),
    );

    return { ...result, content: scannedContent };
  };

  return client;
}
