import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    email: string;
  };
  onSettingsChange: (settings: { pushEnabled: boolean; emailEnabled: boolean; email: string }) => void;
  onRequestPermission: () => Promise<boolean>;
  permission: NotificationPermission;
}

export const NotificationSettings = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onRequestPermission,
  permission,
}: NotificationSettingsProps) => {
  const [email, setEmail] = useState(settings.email);

  useEffect(() => {
    setEmail(settings.email);
  }, [settings.email]);

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await onRequestPermission();
      if (!granted) {
        toast({
          title: 'Permisiune refuzată',
          description: 'Trebuie să permiți notificările în browser.',
          variant: 'destructive',
        });
        return;
      }
    }
    onSettingsChange({ ...settings, pushEnabled: enabled });
  };

  const handleEmailToggle = (enabled: boolean) => {
    if (enabled && !email) {
      toast({
        title: 'Email necesar',
        description: 'Introdu adresa de email pentru notificări.',
        variant: 'destructive',
      });
      return;
    }
    onSettingsChange({ ...settings, emailEnabled: enabled });
  };

  const handleEmailSave = () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Email invalid',
        description: 'Te rugăm să introduci o adresă de email validă.',
        variant: 'destructive',
      });
      return;
    }
    onSettingsChange({ ...settings, email });
    toast({
      title: 'Email salvat',
      description: 'Vei primi notificări la această adresă.',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-background/95 backdrop-blur-xl border-border/50">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Bell className="w-5 h-5 text-primary" />
            Setări Notificări
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-8">
          {/* Push Notifications */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Notificări Push</p>
                  <p className="text-sm text-muted-foreground">Primești alerte direct în browser</p>
                </div>
              </div>
              <Switch
                checked={settings.pushEnabled}
                onCheckedChange={handlePushToggle}
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              {permission === 'granted' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Permisiune acordată</span>
                </>
              ) : permission === 'denied' ? (
                <>
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">Permisiune refuzată</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Necesită permisiune</span>
                </>
              )}
            </div>
          </div>

          {/* Email Notifications */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Mail className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Notificări Email</p>
                  <p className="text-sm text-muted-foreground">Primești alerte pe email</p>
                </div>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={handleEmailToggle}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground">Adresa de email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border-border/50"
                />
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleEmailSave}
                >
                  Salvează
                </Button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h4 className="font-medium text-foreground mb-2">Ce notificări vei primi?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-task" />
                Deadline-uri apropiate (24h înainte)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Zile supraîncărcate (5+ itemi)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Conflicte de programare
              </li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
