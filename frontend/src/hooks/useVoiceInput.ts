'use client';

import { useState, useEffect, useRef } from 'react';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Prevent SSR errors by ensuring code only evaluates in browser window environments
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        // Enable continuous streaming to show live updates as the operator speaks
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let liveSpeechResult = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              liveSpeechResult += event.results[i][0].transcript;
            } else {
              liveSpeechResult += event.results[i][0].transcript;
            }
          }
          setTranscript(liveSpeechResult);
        };

        rec.onerror = (event: any) => {
          setError(event.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      } else {
        setError('Web Speech API is not supported in this browser version.');
      }
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    setIsListening(false);
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
}