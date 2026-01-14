import { Calendar, Bell, Link2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onCalendarClick?: () => void;
  onSettingsClick?: () => void;
  onGoogleCalendarClick?: () => void;
  isGoogleConnected?: boolean;
  conflictCount?: number;
  onConflictsClick?: () => void;
}

export const Header = ({ 
  onCalendarClick, 
  onSettingsClick, 
  onGoogleCalendarClick,
  isGoogleConnected,
  conflictCount = 0,
  onConflictsClick,
}: HeaderProps) => {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-voice-gradient flex items-center justify-center shadow-voice">
          <span className="text-xl font-bold text-primary-foreground">V</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Vox</h1>
          <p className="text-xs text-muted-foreground">Asistentul tău personal</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Conflicts indicator */}
        {conflictCount > 0 && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onConflictsClick}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 relative"
            title={`${conflictCount} conflict${conflictCount === 1 ? '' : 'e'} de programare`}
          >
            <AlertTriangle className="h-5 w-5" />
            <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {conflictCount}
            </div>
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onGoogleCalendarClick}
          className="text-muted-foreground hover:text-foreground relative"
          title="Google Calendar"
        >
          <Link2 className="h-5 w-5" />
          {isGoogleConnected && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
          )}
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onCalendarClick}
          className="text-muted-foreground hover:text-foreground"
        >
          <Calendar className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onSettingsClick}
          className="text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
