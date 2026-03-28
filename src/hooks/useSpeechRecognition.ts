import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage Web Speech API recognition.
 * 
 * @param onResult - Callback function to handle the transcript result.
 * @returns An object containing the listening state, error state, and toggle method.
 */
export function useSpeechRecognition(onResult: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        onResult(transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setError(`Voice error: ${event.error}`);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onResult]);

  const toggleListening = useCallback(() => {
    if (!recognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setError(null);
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech start error:", e);
        setError("Could not start voice recognition.");
      }
    }
  }, [recognition, isListening]);

  return { isListening, error, toggleListening };
}
