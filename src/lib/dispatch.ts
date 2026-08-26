import { prisma } from "./prisma.js";
import { sendSSE } from "./sse.js";
import { findAndRankEligibleWorkers } from "./fairShare.js";
import { GoogleGenAI, Type } from "@google/genai";

export async function triggerEmergencyDispatch(task: any) {
  if (task.taskType === "INSTITUTIONAL_PARENT") {
    console.log(`Skipping emergency dispatch for institutional parent task ${task.id}`);
    return;
  }
  try {
    console.log(`Starting emergency dispatch for task ${task.id}`);
    
    const rankedCandidates = await findAndRankEligibleWorkers(task.id);

    if (!rankedCandidates || rankedCandidates.length === 0) {
      console.log(`No eligible workers found for emergency task ${task.id}`);
      return;
    }

    console.log(`Found ${rankedCandidates.length} eligible candidates for emergency task ${task.id}`);

    // Top 5 candidates from Fair-Share
    let topCandidates = rankedCandidates.slice(0, 5);

    // AI Assisted Ranking (optional) - Though Fair-Share handles most of it, keeping AI as a secondary signal if desired
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const candidateData = topCandidates.map(c => ({ 
           id: c.workerId, 
           totalScore: c.totalScore,
           reasons: c.reasons
        }));
        
        const prompt = `Rank these pre-qualified emergency responders based on their suitability for the following task:
Task: ${task.title}
Category: ${task.category || 'General'}
Candidates:
${JSON.stringify(candidateData, null, 2)}
Return a JSON array of objects, each containing the 'workerId' and the 'rank' (1 being best).`;

        const response = await ai.models.generateContent({
           model: "gemini-3.6-flash",
           contents: prompt,
           config: {
              responseMimeType: "application/json",
              responseSchema: {
                 type: Type.ARRAY,
                 items: {
                    type: Type.OBJECT,
                    properties: {
                       workerId: { type: Type.STRING },
                       rank: { type: Type.INTEGER }
                    },
                    required: ["workerId", "rank"]
                 }
              }
           }
        });
        
        if (response.text) {
           const aiRanking = JSON.parse(response.text);
           // Re-sort based on AI
           topCandidates.sort((a, b) => {
              const rankA = aiRanking.find((r: any) => r.workerId === a.workerId)?.rank || 999;
              const rankB = aiRanking.find((r: any) => r.workerId === b.workerId)?.rank || 999;
              return rankA - rankB;
           });
           console.log("Applied AI ranking to candidates");
        }
      }
    } catch (aiError) {
      console.error("AI Ranking failed, falling back to deterministic ranking", aiError);
    }

    // Persist notification and send SSE
    for (const candidate of topCandidates) {
      const notificationData = {
        taskId: task.id,
        title: "EMERGENCY: " + task.title,
        serviceCategory: task.category,
        city: task.city,
        price: task.price
      };

      await prisma.notification.create({
        data: {
          userId: candidate.workerId,
          type: "TASK_UPDATE",
          content: `Emergency task available near you: ${task.title}. Accept immediately!`,
          relatedEntityId: task.id
        }
      });
      sendSSE(candidate.workerId, "emergency_task", notificationData);
    }
    
    console.log(`Dispatched emergency task ${task.id} to ${topCandidates.length} workers.`);
  } catch (error) {
    console.error("Emergency dispatch failed", error);
  }
}
