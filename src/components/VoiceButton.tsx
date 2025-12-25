import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Item } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface VoiceButtonProps {
  onItemCreated: (item: Item) => void;
}

export const VoiceButton = ({ onItemCreated }: VoiceButtonProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();

  const { startListening, stopListening, isProcessing } = useVoiceInput({
    onItemCreated: (item) => {
      const typeLabels = {
        task: "Task",
        event: "Eveniment",
        reminder: "Reminder",
      };
      toast({
        title: `${typeLabels[item.type]} creat prin voce! 🎤`,
        description: item.title,
      });
      onItemCreated(item);
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
    if (isListening) return "Te ascult...";
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
