/**
 * Reasoning capability policy for the free pool.
 *
 * The pool is heterogeneous: DeepSeek model ids are the only models for which
 * this shell can safely advertise the DeepSeek effort vocabulary. Every other
 * model is explicitly marked as non-reasoning so stale route/default settings
 * cannot make the harness send an unsupported effort.
 *
 * For older or non-DeepSeek models that still support extended thinking
 * (e.g. mimo-v2.5), we provide a separate "thinking" vocabulary that omits
 * the `max` tier, since those models cap at `high`.
 */

export type ModelReasoningEfforts = false | {
  off: null;
  low: 'low';
  high: 'high';
  max?: 'max';
};

const DEEPSEEK_REASONING_EFFORTS: Exclude<ModelReasoningEfforts, false> = {
  off: null,
  low: 'low',
  high: 'high',
  max: 'max',
};

/** Models that support extended thinking but are NOT DeepSeek.
 *  These use a reduced vocabulary (off/low/high — no max tier). */
const THINKING_CAPABLE_MODELS: readonly RegExp[] = [
  /^mimo/i,
  /^qwen.*think/i,
  /^gemini.*thinking/i,
];

function isThinkingCapableModel(modelId: string): boolean {
  return THINKING_CAPABLE_MODELS.some((re) => re.test(modelId));
}

/** Return the exact reasoning declaration safe for one pool model id. */
export function reasoningEffortsForModel(modelId: string): ModelReasoningEfforts {
  if (isDeepSeekModel(modelId)) return { ...DEEPSEEK_REASONING_EFFORTS };
  if (isThinkingCapableModel(modelId)) {
    return { off: null, low: 'low', high: 'high' };
  }
  return false;
}

/** Identify model ids for which the pool can advertise DeepSeek reasoning. */
export function isDeepSeekModel(modelId: unknown): modelId is string {
  return typeof modelId === 'string' && /^deepseek(?:-|$)/i.test(modelId);
}

/** Best-effort reasoning effort for agent/coding work with older models.
 *  Returns 'high' for thinking-capable models, undefined for others. */
export function defaultAgentReasoningEffort(modelId: string): string | undefined {
  if (isDeepSeekModel(modelId)) return 'high';
  if (isThinkingCapableModel(modelId)) return 'high';
  return undefined;
}
