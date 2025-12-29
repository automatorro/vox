import { useState } from 'react';
import { Plus, X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Category } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#64748b', // Slate
];

interface CategorySelectProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  onCreateCategory: (name: string, color: string) => Promise<Category | null>;
}

export const CategorySelect = ({
  categories,
  selectedCategoryId,
  onSelect,
  onCreateCategory,
}: CategorySelectProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const created = await onCreateCategory(newName.trim(), newColor);
    if (created) {
      onSelect(created.id);
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      setIsCreating(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4" />
        Categorie / Proiect
      </Label>
      
      <div className="flex gap-2">
        <Select
          value={selectedCategoryId || 'none'}
          onValueChange={(v) => onSelect(v === 'none' ? null : v)}
        >
          <SelectTrigger className="bg-background flex-1">
            <SelectValue placeholder="Fără categorie">
              {selectedCategory ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  {selectedCategory.name}
                </div>
              ) : (
                'Fără categorie'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="none">Fără categorie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={isCreating} onOpenChange={setIsCreating}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="flex-shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-popover" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Categorie nouă</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsCreating(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Input
                placeholder="Nume categorie"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-background"
              />
              
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Culoare</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform hover:scale-110",
                        newColor === color && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <Button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="w-full"
                size="sm"
              >
                Creează
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
