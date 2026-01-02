import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Item, VoiceParseResult, VoiceParsedItem } from "@/types";
import { Category } from "@/hooks/useCategories";

interface UseVoiceInputProps {
  onParseComplete: (result: VoiceParseResult) => void;
  onError: (error: string) => void;
  onListening: (listening: boolean) => void;
  onTranscript: (transcript: string) => void;
  existingItems?: Item[];
  categories?: Category[];
}

// Language detection based on common words
const detectLanguage = (text: string): 'ro-RO' | 'en-US' => {
  const romanianIndicators = [
    'azi', 'mâine', 'poimâine', 'acum', 'urgent', 'important',
    'task', 'sarcină', 'întâlnire', 'amintește', 'adaugă',
    'dimineață', 'seară', 'prânz', 'ora', 'minute',
    'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică',
    'și', 'la', 'de', 'cu', 'pentru', 'în'
  ];
  
  const lowerText = text.toLowerCase();
  const romanianCount = romanianIndicators.filter(word => lowerText.includes(word)).length;
  
  // If we detect Romanian words, use Romanian
  return romanianCount >= 1 ? 'ro-RO' : 'en-US';
};

export const useVoiceInput = ({
  onParseComplete,
  onError,
  onListening,
  onTranscript,
  existingItems = [],
  categories = [],
}: UseVoiceInputProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<'ro-RO' | 'en-US'>('ro-RO');
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  const startListening = useCallback(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      onError("Browser-ul tău nu suportă recunoașterea vocală.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    // Start with Romanian, will adapt based on interim results
    recognition.lang = "ro-RO";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      onListening(true);
      finalTranscriptRef.current = "";
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update detected language based on content
      const combinedTranscript = finalTranscript || interimTranscript;
      if (combinedTranscript.length > 5) {
        const detected = detectLanguage(combinedTranscript);
        setDetectedLanguage(detected);
      }

      onTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        finalTranscriptRef.current = finalTranscript;
        processTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      onListening(false);
      
      if (event.error === "not-allowed") {
        onError("Te rog să permiți accesul la microfon.");
      } else if (event.error === "no-speech") {
        onError("Nu am detectat nicio voce. Încearcă din nou.");
      } else {
        onError("Eroare la recunoașterea vocală. Încearcă din nou.");
      }
    };

    recognition.onend = () => {
      onListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onError, onListening, onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    onListening(false);
  }, [onListening]);

  const processTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;

    setIsProcessing(true);

    try {
      // Prepare context for AI - include all items for queries
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // For better context, include items from today and upcoming week
      const relevantItems = existingItems.filter(item => {
        const itemDate = item.type === 'task' 
          ? (item as any).deadline 
          : item.type === 'event' 
            ? (item as any).startTime 
            : (item as any).time;
        const date = new Date(itemDate);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return date >= today && date <= weekFromNow;
      });

      const todayItems = existingItems.filter(item => {
        const itemDate = item.type === 'task' 
          ? (item as any).deadline 
          : item.type === 'event' 
            ? (item as any).startTime 
            : (item as any).time;
        const date = new Date(itemDate);
        return date.toDateString() === today.toDateString();
      });

      const context = {
        transcript,
        language: detectedLanguage,
        existingItems: relevantItems.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          time: item.type === 'task' 
            ? (item as any).deadline 
            : item.type === 'event' 
              ? (item as any).startTime 
              : (item as any).time,
          priority: item.type === 'task' ? (item as any).priority : undefined,
          completed: item.type === 'task' ? (item as any).completed : undefined,
        })),
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
        })),
        todayItemCount: todayItems.length,
      };

      const { data, error } = await supabase.functions.invoke("parse-voice-input", {
        body: context,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Return the full parse result for confirmation
      const parseResult: VoiceParseResult = {
        intent: data.intent || 'create',
        item: data.item,
        conversationalResponse: data.conversationalResponse || undefined,
        queryResults: data.queryResults || [],
        planSuggestions: data.planSuggestions || [],
        warnings: data.warnings || [],
        suggestions: data.suggestions || [],
        confidence: data.confidence || 0.9,
        requiresConfirmation: data.requiresConfirmation ?? true,
        transcript,
      };

      onParseComplete(parseResult);
    } catch (error) {
      console.error("Error processing voice input:", error);
      onError(error instanceof Error ? error.message : "Eroare la procesarea comenzii vocale.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    startListening,
    stopListening,
    isProcessing,
    detectedLanguage,
  };
};
