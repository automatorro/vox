import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Item, Task, Event, Reminder } from "@/types";

interface UseVoiceInputProps {
  onItemCreated: (item: Item) => void;
  onError: (error: string) => void;
  onListening: (listening: boolean) => void;
  onTranscript: (transcript: string) => void;
}

export const useVoiceInput = ({
  onItemCreated,
  onError,
  onListening,
  onTranscript,
}: UseVoiceInputProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      onError("Browser-ul tău nu suportă recunoașterea vocală.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "ro-RO";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      onListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      
      onTranscript(transcript);

      // Only process final results
      if (event.results[event.results.length - 1].isFinal) {
        processTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
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
      const { data, error } = await supabase.functions.invoke("parse-voice-input", {
        body: { transcript },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const parsedItem = data.item;
      
      // Create the item with proper structure
      const now = new Date();
      const id = `voice-${Date.now()}`;

      let newItem: Item;

      if (parsedItem.type === "task") {
        newItem = {
          id,
          type: "task",
          title: parsedItem.title,
          deadline: new Date(parsedItem.deadline || now),
          priority: parsedItem.priority || "medium",
          completed: false,
          createdAt: now,
        } as Task;
      } else if (parsedItem.type === "event") {
        newItem = {
          id,
          type: "event",
          title: parsedItem.title,
          startTime: new Date(parsedItem.startTime || now),
          duration: parsedItem.duration || 60,
          synced: false,
          createdAt: now,
        } as Event;
      } else {
        newItem = {
          id,
          type: "reminder",
          title: parsedItem.title,
          time: new Date(parsedItem.time || now),
          notified: false,
          createdAt: now,
        } as Reminder;
      }

      onItemCreated(newItem);
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
  };
};
