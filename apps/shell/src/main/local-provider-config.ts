/** Local OpenAI-compatible bridges exposed by the desktop shell. */

export const GEMINI_WEB_PROVIDER = 'gemini-web';
export const GEMINI_WEB_DISPLAY_NAME = 'Gemini Web (local — text-only queries)';
/**
 * The Gemini Web2API bridge translates OpenAI Chat Completions requests into
 * Gemini web-session calls. It ONLY supports text queries — image/vision
 * inputs are silently dropped or cause errors upstream. The `defaultInput`
 * field is set to `['text']` to reflect this limitation.
 */
export const GEMINI_WEB_TEXT_ONLY = true;
/** Header required by pi-ai's OpenAI client when a local bridge is keyless. */
export const LOCAL_PROVIDER_AUTH_HEADER = 'Bearer freecode-local';
export const DEFAULT_GEMINI_WEB2API_PORT = 8081;
export const GEMINI_WEB_FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-thinking',
  'gemini-3.1-pro',
  'gemini-3.1-pro-enhanced',
  'gemini-auto',
  'gemini-3.5-flash-thinking-lite',
  'gemini-flash-lite',
] as const;
