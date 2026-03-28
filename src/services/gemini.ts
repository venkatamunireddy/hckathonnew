import { GoogleGenAI, Type } from "@google/genai";

/**
 * Interface representing a structured action to be taken in response to an incident.
 */
export interface StructuredAction {
  /** The type of action (e.g., "dispatch", "notify", "alert") */
  action_type: string;
  /** The target system for the action (e.g., "911-dispatch", "hospital-api", "public-broadcast") */
  target_system: string;
  /** The specific data payload for the action */
  payload_to_send: any;
}

/**
 * Interface representing the full structured data extracted from a chaotic input.
 */
export interface IncidentData {
  /** A unique UUID for the incident */
  incident_id: string;
  /** The domain of the incident (e.g., "medical", "fire", "security") */
  domain: string;
  /** The urgency level from 1 (low) to 5 (critical) */
  urgency_level: number;
  /** Entities extracted from the input */
  extracted_entities: {
    /** The location of the incident */
    location?: string;
    /** Individuals involved */
    individuals?: string[];
    /** Potential hazards identified */
    hazards?: string[];
    [key: string]: any;
  };
  /** A verified, concise summary of the incident */
  verified_summary: string;
  /** A list of structured actions to be executed */
  structured_actions: StructuredAction[];
  /** Optional grounding URLs from Google Search/Maps */
  grounding_urls?: string[];
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Simple in-memory cache to improve efficiency for repeated inputs
const cache = new Map<string, IncidentData>();

/**
 * Processes a chaotic, unstructured input string and converts it into a structured IncidentData object.
 * Uses Gemini-3-Flash with Google Search grounding for enhanced accuracy.
 * 
 * @param input - The raw, unstructured text or transcript to process.
 * @returns A promise that resolves to a structured IncidentData object.
 * @throws Error if the model fails to generate a valid response.
 */
export async function processChaos(input: string): Promise<IncidentData> {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    throw new Error("Input cannot be empty");
  }
  
  // Return cached result if available (Efficiency)
  if (cache.has(trimmedInput)) {
    return cache.get(trimmedInput)!;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: trimmedInput,
      config: {
        systemInstruction: "You are HumanHelpBridge. Convert this chaotic input into a strict JSON object with: `incident_id` (UUID), `domain`, `urgency_level` (1-5), `extracted_entities` (location, individuals, hazards), `verified_summary`, and `structured_actions` (array of action_type, target_system, payload_to_send). NO CHAT. ONLY JSON.",
        responseMimeType: "application/json",
        tools: [
          { googleSearch: {} },
          { googleMaps: {} }
        ], // Multi-service grounding for precision
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

    const result = JSON.parse(response.text) as IncidentData;
    
    // Extract grounding URLs if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const urls = groundingChunks
        .map(chunk => chunk.web?.uri || chunk.maps?.uri)
        .filter((url): url is string => !!url);
      
      if (urls.length > 0) {
        // We can attach these to the result if we extend the interface
        (result as any).grounding_urls = urls;
      }
    }
    
    // Cache the result (Efficiency)
    cache.set(trimmedInput, result);
    
    return result;
  } catch (error) {
    console.error("Gemini processing failed:", error);
    throw new Error(`Failed to bridge chaos: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Logs the incident data to a simulated BigQuery dataset for long-term analytics.
 * 
 * @param data - The structured incident data to log.
 */
export async function logToBigQuery(data: IncidentData): Promise<void> {
  // In a real app, this would call a Cloud Function or BigQuery API directly.
  // For this bridge, we simulate the secure logging protocol.
  console.log(`[BigQuery Protocol] Logging incident ${data.incident_id} to analytics.humanhelpbridge.v1`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
}
