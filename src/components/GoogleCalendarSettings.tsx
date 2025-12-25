import { Calendar, RefreshCw, LogOut, Link2 } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface GoogleCalendarSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isConnected: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

export const GoogleCalendarSettings = ({
  open,
  onOpenChange,
  isConnected,
  isLoading,
  isSyncing,
  onConnect,
  onDisconnect,
  onSync,
}: GoogleCalendarSettingsProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Google Calendar
          </DrawerTitle>
          <DrawerDescription>
            Sincronizează evenimentele cu Google Calendar
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              <div>
                <p className="font-medium">
                  {isConnected ? 'Conectat' : 'Neconectat'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? 'Evenimentele se sincronizează' 
                    : 'Conectează-te pentru sincronizare'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {!isConnected ? (
              <Button
                onClick={onConnect}
                disabled={isLoading}
                className="w-full gap-2"
                variant="default"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {isLoading ? 'Se conectează...' : 'Conectează Google Calendar'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={onSync}
                  disabled={isSyncing}
                  className="w-full gap-2"
                  variant="default"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Se sincronizează...' : 'Sincronizează acum'}
                </Button>

                <Button
                  onClick={onDisconnect}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Deconectează
                </Button>
              </>
            )}
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground">
            <p className="mb-2 font-medium">Sincronizare bidirectională:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Importă evenimentele din Google Calendar</li>
              <li>Evenimentele noi sunt adăugate automat în calendar</li>
              <li>Ștergerea locală se reflectă în Google Calendar</li>
            </ul>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Închide</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
