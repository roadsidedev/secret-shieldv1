import { KeySpot } from '@roadsidelab/keyspot-core';

type OpenAIChatParams = {
  messages: Array<{ role: string; content: string | Array<any> | null }>;
  [key: string]: any;
};

type OpenAIChatResult = {
  choices: Array<{
    message?: { content: string | null; tool_calls?: any[]; [key: string]: any };
    [key: string]: any;
  }>;
  [key: string]: any;
};

async function checkpointText(guard: KeySpot, text: string): Promise<string> {
  const clean = await guard.checkpoint({ content: text });
  return typeof clean.content === 'string' ? clean.content : text;
}

/**
 * Wraps an OpenAI SDK client to scan chat inputs and outputs through KeySpot.
 *
 * Usage:
 *   const guarded = wrapOpenAI(openai, guard);
 *   const completion = await guarded.chat.completions.create({ ... });
 */
export function wrapOpenAI<T extends { chat: { completions: { create: (params: any) => Promise<any> } } }>(
  client: T,
  guard: KeySpot,
): T {
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  (client.chat.completions as any).create = async (params: OpenAIChatParams) => {
    // Scan inbound messages (user/system/tool)
    const safeMessages = await Promise.all(
      (params.messages || []).map(async (msg) => {
        if (typeof msg.content === 'string') {
          return { ...msg, content: await checkpointText(guard, msg.content) };
        }
        return msg;
      }),
    );

    const result: OpenAIChatResult = await originalCreate({ ...params, messages: safeMessages });

    const scannedChoices = await Promise.all(
      result.choices.map(async (choice) => {
        let message = choice.message;
        if (message?.content) {
          message = { ...message, content: await checkpointText(guard, message.content) };
        }
        if (message?.tool_calls) {
          const tool_calls = await Promise.all(
            message.tool_calls.map(async (tc: any) => {
              if (tc?.function?.arguments && typeof tc.function.arguments === 'string') {
                return {
                  ...tc,
                  function: {
                    ...tc.function,
                    arguments: await checkpointText(guard, tc.function.arguments),
                  },
                };
              }
              return tc;
            }),
          );
          message = { ...message, tool_calls };
        }
        return message ? { ...choice, message } : choice;
      }),
    );

    return { ...result, choices: scannedChoices };
  };

  return client;
}
