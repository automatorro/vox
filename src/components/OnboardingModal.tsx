import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Mic, ScanLine, Zap, CheckCircle, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem?: () => void;
  userName?: string;
}

const steps = [
  {
    icon: Calendar,
    title: 'Bine ai venit în DAYVOX! 🎉',
    description: 'Asistentul tău personal de productivitate. Organizează-ți ziua cu taskuri, evenimente și remindere.',
    tip: 'Navighează între Dashboard, Calendar și Eisenhower Matrix din toolbar.',
  },
  {
    icon: Mic,
    title: 'Control vocal cu AI 🎙️',
    description: 'Spune-i lui DAYVOX ce vrei să faci. "Adaugă un task să sun doctorul mâine la 10".',
    tip: 'Apasă butonul de microfon din bara de jos.',
  },
  {
    icon: ScanLine,
    title: 'Scanează notițe 📸',
    description: 'Fotografiază o notiță scrisă de mână și DAYVOX o transformă în taskuri automat.',
    tip: 'Apasă butonul de scanare din bara de jos.',
  },
  {
    icon: Zap,
    title: 'Funcții avansate ⚡',
    description: 'Auto-Pilot, Focus Mode, Habit Tracker, Mood Tracker, Smart Scheduler și multe altele!',
    tip: 'Explorează meniul "Mai multe" din toolbar pentru toate funcționalitățile.',
  },
];

export const OnboardingModal = ({ open, onOpenChange, onAddItem, userName }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem('dayvox-onboarding-complete', 'true');
    onOpenChange(false);
    setCurrentStep(0);
    onAddItem?.();
  };

  const handleSkip = () => {
    localStorage.setItem('dayvox-onboarding-complete', 'true');
    onOpenChange(false);
    setCurrentStep(0);
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent className="max-w-sm mx-auto border-border/50 bg-card">
        <DialogTitle className="sr-only">Ghid de onboarding DAYVOX</DialogTitle>
        <DialogDescription className="sr-only">Pași de introducere pentru utilizatorii noi</DialogDescription>
        
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          {/* Progress dots */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-primary' : i < currentStep ? 'w-4 bg-primary/50' : 'w-4 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <StepIcon className="h-8 w-8 text-primary" />
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {currentStep === 0 && userName ? `${step.title.replace('!', `, ${userName}!`)}` : step.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Tip */}
          <div className="w-full p-3 rounded-xl bg-primary/5 border border-primary/10 mb-6">
            <p className="text-xs text-primary flex items-start gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{step.tip}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex w-full gap-3">
            <Button variant="ghost" onClick={handleSkip} className="flex-1 text-muted-foreground">
              Sari peste
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {isLast ? 'Începe!' : 'Continuă'}
              {!isLast && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
