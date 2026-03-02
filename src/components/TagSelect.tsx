import { useState } from 'react';
import { Plus, X, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tag } from '@/hooks/useTags';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

interface TagSelectProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
}

export const TagSelect = ({
  tags,
  selectedTagIds,
  onSelectionChange,
  onCreateTag,
}: TagSelectProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const tag = await onCreateTag(newName.trim(), newColor);
    if (tag) {
      onSelectionChange([...selectedTagIds, tag.id]);
      setNewName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TagIcon className="h-4 w-4 text-muted-foreground" />
        <Label>Tag-uri</Label>
      </div>

      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5">
        {selectedTagIds.map(id => {
          const tag = tags.find(t => t.id === id);
          if (!tag) return null;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
              style={{ backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => toggleTag(id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>

      {/* Tag picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
            <Plus className="h-3 w-3" />
            Adaugă tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-popover z-50" align="start">
          <div className="space-y-3">
            {/* Existing tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {tags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "hover:scale-105"
                      )}
                      style={{
                        backgroundColor: tag.color + '22',
                        color: tag.color,
                        borderColor: tag.color + '44',
                      }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Create new */}
            {!isCreating ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="w-full gap-1.5 text-xs"
              >
                <Plus className="h-3 w-3" />
                Tag nou
              </Button>
            ) : (
              <div className="space-y-2 pt-2 border-t border-border">
                <Input
                  placeholder="Nume tag..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <div className="flex gap-1">
                  {TAG_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "w-5 h-5 rounded-full transition-all",
                        newColor === c && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreate} className="flex-1 h-7 text-xs">
                    Creează
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsCreating(false); setNewName(''); }}
                    className="h-7 text-xs"
                  >
                    Anulează
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
