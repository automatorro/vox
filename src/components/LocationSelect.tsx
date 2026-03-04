import { MapPin } from "lucide-react";
import { SavedLocation } from "@/hooks/useLocations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LocationSelectProps {
  locations: SavedLocation[];
  selectedLocationId: string | null;
  onSelect: (locationId: string | null) => void;
}

export const LocationSelect = ({ locations, selectedLocationId, onSelect }: LocationSelectProps) => {
  if (locations.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Label>Locație</Label>
      </div>
      <Select
        value={selectedLocationId || "none"}
        onValueChange={(v) => onSelect(v === "none" ? null : v)}
      >
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Fără locație" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="none">Fără locație</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              <span className="flex items-center gap-2">
                <span>{loc.icon}</span>
                <span>{loc.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
