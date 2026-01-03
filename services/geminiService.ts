
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatModel, PracticeQuestion } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const AI_TIMEOUT_MS = 8000; // 8 second strict timeout

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), AI_TIMEOUT_MS);
  });

  return Promise.race([
    promise.then(val => {
      clearTimeout(timeoutId);
      return val;
    }).catch(err => {
      console.error("AI Promise failed:", err);
      clearTimeout(timeoutId);
      return fallback;
    }),
    timeoutPromise
  ]);
}

export interface SuggestedTask {
  title: string;
  description: string;
  category: string;
}

export interface MasteryChallenge {
  questions: PracticeQuestion[];
  nextQuest: SuggestedTask;
}

export const getAITaskSuggestions = async (goal: string): Promise<SuggestedTask[]> => {
  const ai = getAI();
  const apiCall = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Act as a personal academic coach. Break down the following high-level student goal into exactly 3-5 highly specific, actionable, and bite-sized sub-tasks that can be completed in one sitting. 
        Goal: "${goal}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["title", "description", "category"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
  };

  return withTimeout(apiCall(), []);
};

export const getMasteryChallenge = async (topic: string): Promise<MasteryChallenge> => {
  const ai = getAI();
  const apiCall = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `The student just completed a quest on: "${topic}". 
        1. Generate a "Mastery Bonus Exam" consisting of exactly 10 multiple-choice questions based on this topic.
        2. Provide one "Effective Quest" (an advanced follow-up task) to continue their growth.
        
        Questions must be challenging and cover different aspects of the topic.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "question", "options", "correctAnswer", "explanation"]
                }
              },
              nextQuest: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["title", "description", "category"]
              }
            },
            required: ["questions", "nextQuest"]
          }
        }
      });
      return JSON.parse(response.text || '{"questions":[], "nextQuest": {"title": "Self-Review", "description": "Review your recent work.", "category": "Other"}}');
    } catch (e) {
      throw e;
    }
  };

  return withTimeout(apiCall(), { questions: [], nextQuest: { title: "Knowledge Review", description: "Review what you just learned deeply.", category: "Other" } });
};

export const getProgressNudge = async (completed: number, total: number): Promise<string> => {
  const ai = getAI();
  const apiCall = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `User has completed ${completed}/${total} tasks today. Give a 1-sentence supportive academic nudge.`,
      });
      return response.text || "Focus on the journey.";
    } catch (e) {
      return "Keep pushing forward.";
    }
  };
  return withTimeout(apiCall(), "Consistency is the path to mastery.");
};

export const chatWithRudhh = async (
  message: string, 
  history: any[], 
  preference: ChatModel,
  personality: string
): Promise<{ text: string; modelName: string; groundingChunks?: any[] }> => {
  const ai = getAI();
  const modelName = 'gemini-3-flash-preview';
  const apiCall = async () => {
    try {
      const config: any = {
        systemInstruction: `You are Dr. Rudhh. Personality: ${personality}. Help students solve problems and explain concepts. Use search for accuracy.`,
        tools: [{ googleSearch: {} }]
      };
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config,
      });
      return { 
        text: response.text || "I'm processing a large amount of data. Could you repeat that?", 
        modelName,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
      };
    } catch (e) {
      throw e;
    }
  };

  return withTimeout(apiCall(), { 
    text: "I'm currently recalibrating my data nodes. Please try messaging me again in a moment.", 
    modelName,
    groundingChunks: undefined
  });
};

export const analyzeImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getAI();
  const apiCall = async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }]
        }
      });
      return response.text || "Image analyzed.";
    } catch (e) {
      return "Analysis failed.";
    }
  };
  return withTimeout(apiCall(), "Analysis timed out. Please check your connection.");
};

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const speakResponse = async (text: string): Promise<void> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const bytes = decodeBase64(base64Audio);
    
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const dataInt16 = new Int16Array(arrayBuffer);
    
    const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (e) {
    console.error("TTS Error:", e);
  }
};
