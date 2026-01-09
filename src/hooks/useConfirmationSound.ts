import { useCallback } from "react";

// Create a simple confirmation sound using Web Audio API
export const useConfirmationSound = () => {
  const playConfirmationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a pleasant "pop" sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant frequency for confirmation
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
      
      oscillator.type = "sine";
      
      // Quick fade in and out for a "pop" effect
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // Clean up
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      // Silently fail if audio is not supported
      console.warn("Audio not supported:", error);
    }
  }, []);

  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a pleasant two-tone success sound
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
        
        oscillator.onended = () => {
          oscillator.disconnect();
          gainNode.disconnect();
        };
      };
      
      // Two ascending tones for a pleasant "success" sound
      playTone(523.25, audioContext.currentTime, 0.12); // C5
      playTone(659.25, audioContext.currentTime + 0.08, 0.15); // E5
    } catch (error) {
      console.warn("Audio not supported:", error);
    }
  }, []);

  return { playConfirmationSound, playSuccessSound };
};
