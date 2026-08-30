import { GoogleGenAI } from "@google/genai";
import { generateContentWithRetry } from "./src/lib/ai-helper.ts"; // Need tsx or we can just copy it

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Hello"
  });
  console.log("Success:", response.text);
} catch (e) {
  console.error("Error:", e.message);
}
