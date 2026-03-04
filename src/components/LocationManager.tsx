import { useState } from "react";
import { MapPin, Plus, Trash2, Navigation, Pencil, Loader2 } from "lucide-react";
import { SavedLocation } from "@/hooks/useLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const LOCATION_ICONS = ['📍', '🏠', '🏢', '🏫', '🏪', '🏥', '🏋️', '☕', '🍕', '🚗', '✈️', '🌳'];

interface LocationManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: SavedLocation[];
  onCreateLocation: (loc: Omit<SavedLocation, 'id' | 'createdAt'>) => Promise<SavedLocation | null>;
  onUpdateLocation: (loc: SavedLocation) => Promise<boolean>;
  onDeleteLocation: (id: string) => Promise<boolean>;
  getCurrentPosition: () => Promise<{ lat: number; lng: number } | null>;
}

export const LocationManager = ({
  open,
  onOpenChange,
  locations,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  getCurrentPosition,
}: LocationManagerProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [icon, setIcon] = useState('📍');
  const [radius, setRadius] = useState(200);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [detecting, setDetecting] = useState(false);

  const resetForm = () => {
    setName('');
    setAddress('');
    setIcon('📍');
    setRadius(200);
    setLat('');
    setLng('');
    setEditingLocation(null);
  };

  const handleDetectPosition = async () => {
    setDetecting(true);
    const pos = await getCurrentPosition();
    if (pos) {
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
    }
    setDetecting(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !lat || !lng) return;

    if (editingLocation) {
      await onUpdateLocation({
        ...editingLocation,
        name: name.trim(),
        address: address.trim() || undefined,
        icon,
        radiusMeters: radius,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      });
    } else {
      await onCreateLocation({
        name: name.trim(),
        address: address.trim() || undefined,
        icon,
        radiusMeters: radius,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      });
    }

    resetForm();
    setAddDialogOpen(false);
  };

  const handleEdit = (loc: SavedLocation) => {
    setEditingLocation(loc);
    setName(loc.name);
    setAddress(loc.address || '');
    setIcon(loc.icon);
    setRadius(loc.radiusMeters);
    setLat(loc.latitude.toString());
    setLng(loc.longitude.toString());
    setAddDialogOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-card border-border">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-xl flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Locații salvate
            </SheetTitle>
            <SheetDescription>
              Gestionează locațiile pentru reminder-uri de proximitate
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 overflow-y-auto max-h-[calc(70vh-180px)]">
            {locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nicio locație salvată</p>
                <p className="text-sm mt-1">Adaugă locații pentru a primi reminder-uri bazate pe proximitate</p>
              </div>
            ) : (
              locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border"
                >
                  <span className="text-2xl">{loc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{loc.name}</p>
                    {loc.address && (
                      <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Rază: {loc.radiusMeters}m
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(loc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteLocation(loc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4">
            <Button className="w-full gap-2" onClick={() => { resetForm(); setAddDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Adaugă locație
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(v) => { setAddDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Editează locația' : 'Locație nouă'}</DialogTitle>
            <DialogDescription>
              {editingLocation ? 'Modifică detaliile locației' : 'Adaugă o locație favorită pentru reminder-uri de proximitate'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon selector */}
            <div className="space-y-2">
              <Label>Pictogramă</Label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all
                      ${icon === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted/50 hover:bg-muted'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-name">Nume</Label>
              <Input
                id="loc-name"
                placeholder="Ex: Acasă, Birou, Sala de sport"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-address">Adresă (opțional)</Label>
              <Input
                id="loc-address"
                placeholder="Ex: Str. Exemplu nr. 10"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* GPS coordinates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Coordonate GPS</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  onClick={handleDetectPosition}
                  disabled={detecting}
                >
                  {detecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                  Detectează locația
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Latitudine"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="bg-background text-sm"
                  type="number"
                  step="any"
                />
                <Input
                  placeholder="Longitudine"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="bg-background text-sm"
                  type="number"
                  step="any"
                />
              </div>
            </div>

            {/* Radius slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rază de activare</Label>
                <span className="text-sm text-muted-foreground">{radius}m</span>
              </div>
              <Slider
                value={[radius]}
                onValueChange={([v]) => setRadius(v)}
                min={50}
                max={1000}
                step={50}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!name.trim() || !lat || !lng}
            >
              {editingLocation ? 'Salvează modificările' : 'Adaugă locația'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
