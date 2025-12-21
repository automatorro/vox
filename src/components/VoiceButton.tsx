import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface VoiceButtonProps {
  onActivate?: () => void;
}

export const VoiceButton = ({ onActivate }: VoiceButtonProps) => {
  const [isListening, setIsListening] = useState(false);

  const handleClick = () => {
    setIsListening(!isListening);
    onActivate?.();
  };

  return (
    <div className="relative">
      {/* Pulse rings */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-voice-gradient opacity-30 animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-voice-gradient opacity-20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
        </>
      )}
      
      <Button
        variant="voice"
        size="voice"
        onClick={handleClick}
        className={`relative z-10 ${isListening ? 'scale-110' : ''}`}
      >
        <Mic className={`h-8 w-8 ${isListening ? 'animate-pulse' : ''}`} />
      </Button>
      
      {/* Label */}
      <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-muted-foreground whitespace-nowrap">
        {isListening ? 'Te ascult...' : 'Spune ce ai de făcut'}
      </p>
    </div>
  );
};
