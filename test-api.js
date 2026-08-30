import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const AIResponseSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string(),
      observation: z.string(),
      recommendation: z.string(),
      reason: z.string(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
      confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
    })
  )
});

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const aiPayload = { dummy: "data" };
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Return empty insights array: {"insights": []}`
    });
    
    const text = response.text || "{}";
    console.log("TEXT:", text);
    const data = JSON.parse(text);
    const parsedData = AIResponseSchema.parse(data);
    console.log("PARSED:", parsedData);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();
