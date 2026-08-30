const { GoogleGenAI } = require('@google/genai');
async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: "fake-key" });
    await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Hello"
    });
  } catch (e) {
    console.log("CATCH:", e.message);
  }
}
test();
