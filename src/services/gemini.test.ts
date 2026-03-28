import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processChaos, logToBigQuery } from './gemini';

// Mock the GoogleGenAI SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            incident_id: 'test-uuid',
            domain: 'medical',
            urgency_level: 5,
            extracted_entities: { location: 'Main St' },
            verified_summary: 'Medical emergency on Main St',
            structured_actions: []
          }),
          candidates: [{
            groundingMetadata: {
              groundingChunks: [{ web: { uri: 'https://example.com' } }]
            }
          }]
        })
      }
    })),
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      INTEGER: 'INTEGER',
      ARRAY: 'ARRAY'
    }
  };
});

describe('processChaos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process input and return structured data with grounding', async () => {
    const result = await processChaos('Help! Medical emergency on Main St');
    
    expect(result).toBeDefined();
    expect(result.incident_id).toBe('test-uuid');
    expect(result.domain).toBe('medical');
    expect((result as any).grounding_urls).toContain('https://example.com');
  });

  it('should throw an error for empty or whitespace input', async () => {
    await expect(processChaos('   ')).rejects.toThrow('Input cannot be empty');
  });

  it('should log to BigQuery', async () => {
    const mockData = {
      incident_id: '123',
      domain: 'medical',
      urgency_level: 5,
      verified_summary: 'Test summary',
      structured_actions: []
    };
    
    const spy = vi.spyOn(console, 'log');
    await logToBigQuery(mockData as any);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[BigQuery Protocol]'));
  });
});
