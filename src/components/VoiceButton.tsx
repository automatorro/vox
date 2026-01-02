import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Item, VoiceParseResult } from "@/types";
import { Category } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";

interface VoiceButtonProps {
  onParseComplete: (result: VoiceParseResult) => void;
  existingItems?: Item[];
  categories?: Category[];
}

export const VoiceButton = ({ 
  onParseComplete, 
  existingItems = [], 
  categories = [] 
}: VoiceButtonProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();

  const { startListening, stopListening, isProcessing, detectedLanguage } = useVoiceInput({
    onParseComplete: (result) => {
      onParseComplete(result);
      setTranscript("");
    },
    onError: (error) => {
      toast({
        title: "Eroare",
        description: error,
        variant: "destructive",
      });
      setTranscript("");
    },
    onListening: setIsListening,
    onTranscript: setTranscript,
    existingItems,
    categories,
  });

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getStatusText = () => {
    if (isProcessing) return "Procesez...";
    if (isListening && transcript) return `"${transcript}"`;
    if (isListening) return detectedLanguage === 'en-US' ? "Listening..." : "Te ascult...";
    return "Spune ce ai de făcut";
  };

  return (
    <div className="relative">
      {/* Pulse rings */}
      {isListening && !isProcessing && (
        <>
          <div className="absolute inset-0 rounded-full bg-voice-gradient opacity-30 animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-voice-gradient opacity-20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
        </>
      )}
      
      <Button
        variant="voice"
        size="voice"
        onClick={handleClick}
        disabled={isProcessing}
        className={`relative z-10 ${isListening ? 'scale-110' : ''}`}
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <Mic className={`h-8 w-8 ${isListening ? 'animate-pulse' : ''}`} />
        )}
      </Button>
      
      {/* Label */}
      <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-muted-foreground whitespace-nowrap max-w-[200px] truncate text-center">
        {getStatusText()}
      </p>
    </div>
  );
};
