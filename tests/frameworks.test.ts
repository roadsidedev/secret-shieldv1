import { describe, it, expect, vi } from 'vitest';
import { KeySpot } from '@roadsidelab/keyspot-sdk';
import { withKeySpot, wrapAnthropic, wrapOpenAI, wrapOpenClawAgent, wrapHermesAgent } from '@roadsidelab/keyspot-sdk/frameworks';

describe('Framework Wrappers', () => {
  describe('withKeySpot (LangChain)', () => {
    it('scans chain output through checkpoint', async () => {
      const guard = new KeySpot({ taintEnabled: true });
      const chain = {
        invoke: vi.fn().mockResolvedValue({
          output: 'my key is sk-123456789012345678901234567890123456789012345678'
        }),
      };

      const guarded = withKeySpot(chain, guard);
      const result = await guarded.invoke({ input: 'test' });

      expect(result.output).toMatch(/^vault:v1:/);
    });

    it('passes clean output through unchanged', async () => {
      const guard = new KeySpot();
      const chain = {
        invoke: vi.fn().mockResolvedValue({ output: 'clean response' }),
      };

      const guarded = withKeySpot(chain, guard);
      const result = await guarded.invoke({ input: 'test' });

      expect(result.output).toBe('clean response');
    });
  });

  describe('wrapAnthropic', () => {
    it('scans assistant text responses for secrets', async () => {
      const guard = new KeySpot({ taintEnabled: true });
      const client = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: 'msg_1',
            content: [
              { type: 'text', text: 'my key is sk-123456789012345678901234567890123456789012345678' }
            ],
            model: 'claude-3-sonnet',
          }),
        },
      };

      const guarded = wrapAnthropic(client, guard);
      const result = await guarded.messages.create({
        messages: [{ role: 'user', content: 'what is my key?' }],
        model: 'claude-3-sonnet',
      });

      expect(result.id).toBe('msg_1');
      expect(result.content[0].text).toMatch(/^vault:v1:/);
    });

    it('preserves non-text content blocks', async () => {
      const guard = new KeySpot();
      const client = {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: 'msg_1',
            content: [
              { type: 'tool_use', name: 'calculator', input: { x: 1 } },
              { type: 'text', text: 'clean response' },
            ],
            model: 'claude-3-sonnet',
          }),
        },
      };

      const guarded = wrapAnthropic(client, guard);
      const result = await guarded.messages.create({
        messages: [{ role: 'user', content: 'calculate' }],
        model: 'claude-3-sonnet',
      });

      expect(result.content[0].type).toBe('tool_use');
      expect(result.content[1].text).toBe('clean response');
    });
  });

  describe('wrapOpenAI', () => {
    it('scans chat completion responses for secrets', async () => {
      const guard = new KeySpot({ taintEnabled: true });
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              id: 'chat_1',
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: 'the key is sk-123456789012345678901234567890123456789012345678',
                  },
                },
              ],
              model: 'gpt-4',
            }),
          },
        },
      };

      const guarded = wrapOpenAI(client, guard);
      const result = await guarded.chat.completions.create({
        messages: [{ role: 'user', content: 'show key' }],
        model: 'gpt-4',
      });

      expect(result.id).toBe('chat_1');
      expect(result.choices[0].message.content).toMatch(/^vault:v1:/);
    });

    it('handles null content gracefully', async () => {
      const guard = new KeySpot();
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              id: 'chat_1',
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: null },
                },
              ],
              model: 'gpt-4',
            }),
          },
        },
      };

      const guarded = wrapOpenAI(client, guard);
      const result = await guarded.chat.completions.create({
        messages: [{ role: 'user', content: 'hello' }],
        model: 'gpt-4',
      });

      expect(result.choices[0].message.content).toBeNull();
    });
  });

  describe('wrapOpenClawAgent', () => {
    it('scans agent run output through checkpoint', async () => {
      const guard = new KeySpot({ taintEnabled: true });
      const agent: any = {
        run: vi.fn().mockResolvedValue({
          summary: 'deployed with key sk-123456789012345678901234567890123456789012345678',
        }),
      };

      const guarded = wrapOpenClawAgent(agent, guard);
      const result = await guarded.run('deploy app', { branch: 'main' });

      expect(result.summary).toMatch(/^vault:v1:/);
    });

    it('preserves clean agent output', async () => {
      const guard = new KeySpot();
      const agent: any = {
        run: vi.fn().mockResolvedValue({ status: 'ok', message: 'deployment complete' }),
      };

      const guarded = wrapOpenClawAgent(agent, guard);
      const result = await guarded.run('deploy', {});

      expect(result.status).toBe('ok');
      expect(result.message).toBe('deployment complete');
    });
  });

  describe('wrapHermesAgent', () => {
    it('scans agent run output through checkpoint', async () => {
      const guard = new KeySpot({ taintEnabled: true });
      const agent: any = {
        run: vi.fn().mockResolvedValue({
          result: 'token is sk-123456789012345678901234567890123456789012345678',
        }),
      };

      const guarded = wrapHermesAgent(agent, guard);
      const result = await guarded.run({ task: 'audit', path: './src' });

      expect(result.result).toMatch(/^vault:v1:/);
    });

    it('preserves clean agent output', async () => {
      const guard = new KeySpot();
      const agent: any = {
        run: vi.fn().mockResolvedValue({ status: 'clean' }),
      };

      const guarded = wrapHermesAgent(agent, guard);
      const result = await guarded.run({ task: 'check' });

      expect(result.status).toBe('clean');
    });
  });

  describe('Error Propagation', () => {
    it('withKeySpot propagates errors from the guard', async () => {
      const guard = new KeySpot({ hosted: { enabled: true } });
      const chain = {
        invoke: vi.fn().mockResolvedValue({ output: 'test' }),
      };
      const guarded = withKeySpot(chain, guard);
      await expect(guarded.invoke({})).rejects.toThrow();
    });

    it('withKeySpot propagates errors from the original invoke', async () => {
      const guard = new KeySpot();
      const chain = {
        invoke: vi.fn().mockRejectedValue(new Error('chain error')),
      };
      const guarded = withKeySpot(chain, guard);
      await expect(guarded.invoke({})).rejects.toThrow('chain error');
    });

    it('wrapOpenAI propagates errors from original create', async () => {
      const guard = new KeySpot();
      const client = {
        chat: { completions: { create: vi.fn().mockRejectedValue(new Error('API error')) } },
      };
      const guarded = wrapOpenAI(client, guard);
      await expect(
        guarded.chat.completions.create({ messages: [] })
      ).rejects.toThrow('API error');
    });

    it('wrapAnthropic propagates errors from original create', async () => {
      const guard = new KeySpot();
      const client = {
        messages: { create: vi.fn().mockRejectedValue(new Error('Anthropic error')) },
      };
      const guarded = wrapAnthropic(client, guard);
      await expect(
        guarded.messages.create({ messages: [] })
      ).rejects.toThrow('Anthropic error');
    });
  });
});
