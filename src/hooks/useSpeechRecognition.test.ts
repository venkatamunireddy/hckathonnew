import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  onresult: null,
  onerror: null,
  onend: null,
  continuous: false,
  interimResults: false,
  lang: 'en-US'
};

(global as any).window.SpeechRecognition = vi.fn(() => mockSpeechRecognition);
(global as any).window.webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition);

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with listening false', () => {
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()));
    expect(result.current.isListening).toBe(false);
  });

  it('should toggle listening', () => {
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()));
    
    act(() => {
      result.current.toggleListening();
    });

    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  it('should handle speech results', () => {
    const onResult = vi.fn();
    renderHook(() => useSpeechRecognition(onResult));
    
    const mockEvent = {
      resultIndex: 0,
      results: [
        [{ transcript: 'hello world' }]
      ]
    };

    act(() => {
      (mockSpeechRecognition as any).onresult(mockEvent);
    });

    expect(onResult).toHaveBeenCalledWith('hello world');
  });

  it('should handle errors', () => {
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()));
    
    act(() => {
      result.current.toggleListening();
    });

    const mockError = { error: 'no-speech' };

    act(() => {
      (mockSpeechRecognition as any).onerror(mockError);
    });

    expect(result.current.error).toContain('no-speech');
    expect(result.current.isListening).toBe(false);
  });
});
