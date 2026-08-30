require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Hello"
    });
    console.log("SUCCESS");
  } catch (e) {
    console.log("CATCH:", e.message);
  }
}
test();
