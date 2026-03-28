import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface StructuredAction {
  action_type: string;
  target_system: string;
  payload_to_send: any;
}

export interface IncidentData {
  incident_id: string;
  domain: string;
  urgency_level: number;
  extracted_entities: {
    location?: string;
    individuals?: string[];
    hazards?: string[];
    [key: string]: any;
  };
  verified_summary: string;
  structured_actions: StructuredAction[];
}

export async function processChaos(input: string): Promise<IncidentData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: input,
    config: {
      systemInstruction: "You are HumanHelpBridge. Convert this chaotic input into a strict JSON object with: `incident_id` (UUID), `domain`, `urgency_level` (1-5), `extracted_entities` (location, individuals, hazards), `verified_summary`, and `structured_actions` (array of action_type, target_system, payload_to_send). NO CHAT. ONLY JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          incident_id: { type: Type.STRING },
          domain: { type: Type.STRING },
          urgency_level: { type: Type.INTEGER },
          extracted_entities: {
            type: Type.OBJECT,
            properties: {
              location: { type: Type.STRING },
              individuals: { type: Type.ARRAY, items: { type: Type.STRING } },
              hazards: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          verified_summary: { type: Type.STRING },
          structured_actions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action_type: { type: Type.STRING },
                target_system: { type: Type.STRING },
                payload_to_send: { type: Type.OBJECT }
              },
              required: ["action_type", "target_system", "payload_to_send"]
            }
          }
        },
        required: ["incident_id", "domain", "urgency_level", "verified_summary", "structured_actions"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(response.text) as IncidentData;
}
