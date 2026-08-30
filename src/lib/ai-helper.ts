export async function generateContentWithRetry(ai: any, params: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (e: any) {
      if (i === retries - 1) throw e;
      if (e?.status === 503 || e?.status === 429 || e?.message?.includes("high demand") || e?.message?.includes("503") || e?.message?.includes("UNAVAILABLE")) {
        console.warn(`[Gemini] High Demand / Rate Limit, retrying... (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i) + Math.random() * 500));
        continue;
      }
      throw e;
    }
  }
}
