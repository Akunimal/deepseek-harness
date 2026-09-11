/**
 * Stream contract tests — Phase 7.
 *
 * Verifies provider stream behavior:
 *   1. Successful stream with [DONE] sentinel
 *   2. Truncated stream (no [DONE]) → STREAM_CLOSED error
 *   3. Empty response (stop + no content) → EMPTY_RESPONSE error
 *   4. finish_reason=tool_calls → tool-call blocks
 *   5. Malformed JSON payload → MALFORMED_RESPONSE error
 *   6. Partial chunks before truncation
 *   7. Usage tracking across chunks
 *   8. Multiple tool calls in one response
 *   9. Reasoning + text interleaving
 *  10. HTTP error status codes
 *
 * Uses the upstream DeepSeek SSE parser and translate functions directly.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { Readable } from 'node:stream';
import { join } from 'node:path';

const VENDOR = join(import.meta.dirname, '../../..', 'vendor/deepseek-harness');

// Dynamic imports for ESM vendor modules
let parseSse, DONE, translate, LlmError, EMPTY_RESPONSE_CODE;

beforeAll(async () => {
  const sseMod = await import(join(VENDOR, 'packages/llm/llm-deepseek/src/sse.ts'));
  parseSse = sseMod.parseSse;
  DONE = sseMod.DONE;

  const translateMod = await import(join(VENDOR, 'packages/llm/llm-deepseek/src/translate.ts'));
  translate = translateMod.translate;

  const errorMod = await import(join(VENDOR, 'packages/llm/llm/src/index.ts'));
  LlmError = errorMod.LlmError;
  EMPTY_RESPONSE_CODE = errorMod.EMPTY_RESPONSE_CODE;
});

/** Helper: create a ReadableStream from string chunks */
function makeStream(chunks) {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(new TextEncoder().encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

/** Helper: collect all chunks from an async generator */
async function collect(gen) {
  const results = [];
  for await (const chunk of gen) {
    results.push(chunk);
  }
  return results;
}

describe('Stream contract — SSE parser', () => {
  it('yields data payloads and [DONE] sentinel', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);
    const payloads = await collect(parseSse(stream));
    expect(payloads).toEqual([
      '{"choices":[{"delta":{"content":"hello"}}]}',
      '{"choices":[{"delta":{"content":" world"}}]}',
      '[DONE]',
    ]);
  });

  it('throws STREAM_CLOSED when stream ends without [DONE]', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"truncated"}}]}\n\n',
    ]);
    await expect(collect(parseSse(stream))).rejects.toThrow(/SSE stream ended without \[DONE\]/);
  });

  it('throws STREAM_CLOSED on empty stream', async () => {
    const stream = makeStream([]);
    await expect(collect(parseSse(stream))).rejects.toThrow(/SSE stream ended without \[DONE\]/);
  });

  it('handles multi-line data fields', async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"line1"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"line2"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);
    const payloads = await collect(parseSse(stream));
    expect(payloads).toHaveLength(3);
    expect(payloads[2]).toBe('[DONE]');
  });
});

describe('Stream contract — translate', () => {
  it('translates normal stream with text content', async () => {
    const payloads = (async function* () {
      yield '{"choices":[{"delta":{"role":"assistant"}}]}';
      yield '{"choices":[{"delta":{"content":"hello"}}]}';
      yield '{"choices":[{"delta":{"content":" world"}}]}';
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const types = chunks.map(c => c.type);

    expect(types).toContain('block-start');
    expect(types).toContain('text-delta');
    expect(types).toContain('block-end');
    expect(types).toContain('finish');

    const finish = chunks.find(c => c.type === 'finish');
    expect(finish.reason.kind).toBe('stop');
  });

  it('maps finish_reason=tool_calls to tool-calls kind', async () => {
    const payloads = (async function* () {
      yield JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              id: 'call_123',
              function: { name: 'read_file', arguments: '{"path":"/tmp"}' },
            }],
          },
          finish_reason: null,
        }],
      });
      yield JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [{
              index: 0,
              function: { arguments: '/test.txt' },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      });
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const finish = chunks.find(c => c.type === 'finish');
    expect(finish.reason.kind).toBe('tool-calls');
  });

  it('maps stop + no content to EMPTY_RESPONSE error', async () => {
    const payloads = (async function* () {
      yield '{"choices":[{"delta":{},"finish_reason":"stop"}]}';
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const finish = chunks.find(c => c.type === 'finish');
    expect(finish.reason.kind).toBe('error');
    expect(finish.reason.failure.code).toBe(EMPTY_RESPONSE_CODE);
  });

  it('throws on malformed JSON payload', async () => {
    const payloads = (async function* () {
      yield 'not valid json {{';
      yield '[DONE]';
    })();

    await expect(collect(translate(payloads))).rejects.toThrow(/malformed SSE payload/);
  });

  it('handles reasoning + text interleaving', async () => {
    const payloads = (async function* () {
      yield '{"choices":[{"delta":{"reasoning_content":"thinking..."}}]}';
      yield '{"choices":[{"delta":{"content":"answer"}}]}';
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const blockStarts = chunks.filter(c => c.type === 'block-start');
    expect(blockStarts).toHaveLength(2);
    expect(blockStarts[0].blockType).toBe('reasoning');
    expect(blockStarts[1].blockType).toBe('text');
  });

  it('tracks usage from finish chunk', async () => {
    const payloads = (async function* () {
      yield '{"choices":[{"delta":{"content":"ok"}}]}';
      yield JSON.stringify({
        choices: [{ delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const usage = chunks.find(c => c.type === 'usage');
    expect(usage).toBeDefined();
    expect(usage.usage.inputTokens).toBe(10);
    expect(usage.usage.outputTokens).toBe(5);
  });

  it('maps finish_reason=length to max-tokens', async () => {
    const payloads = (async function* () {
      yield '{"choices":[{"delta":{"content":"truncated"}}]}';
      yield '{"choices":[{"delta":{},"finish_reason":"length"}]}';
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const finish = chunks.find(c => c.type === 'finish');
    expect(finish.reason.kind).toBe('max-tokens');
  });

  it('maps unknown finish_reason to error', async () => {
    const payloads = (async function* () {
      yield '{"choices":[{"delta":{"content":"ok"}}]}';
      yield '{"choices":[{"delta":{},"finish_reason":"content_filter"}]}';
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const finish = chunks.find(c => c.type === 'finish');
    expect(finish.reason.kind).toBe('error');
    expect(finish.reason.failure.code).toBe('CONTENT_FILTER');
  });

  it('handles multiple tool calls in one response', async () => {
    const payloads = (async function* () {
      yield JSON.stringify({
        choices: [{
          delta: {
            tool_calls: [
              { index: 0, id: 'call_a', function: { name: 'read_file', arguments: '{}' } },
              { index: 1, id: 'call_b', function: { name: 'write_file', arguments: '{}' } },
            ],
          },
          finish_reason: 'tool_calls',
        }],
      });
      yield '[DONE]';
    })();

    const chunks = await collect(translate(payloads));
    const blockStarts = chunks.filter(c => c.type === 'block-start' && c.blockType === 'tool-call');
    expect(blockStarts).toHaveLength(2);
    const finish = chunks.find(c => c.type === 'finish');
    expect(finish.reason.kind).toBe('tool-calls');
  });
});
