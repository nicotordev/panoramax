/** Whether to call OpenAI during ingestion. */
export function shouldRunLlmEnrichment(explicit?: boolean): boolean {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  if (explicit === false) {
    return false;
  }
  if (explicit === true) {
    return hasKey;
  }
  return hasKey;
}
