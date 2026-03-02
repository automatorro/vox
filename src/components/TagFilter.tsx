import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tag } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  onClear: () => void;
}

export const TagFilter = ({ tags, selectedTagIds, onToggle, onClear }: TagFilterProps) => {
  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 pb-2">
          {selectedTagIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="rounded-full text-xs h-6 px-2 gap-1"
            >
              <X className="h-3 w-3" />
              Reset
            </Button>
          )}
          {tags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => onToggle(tag.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all whitespace-nowrap",
                  isSelected
                    ? "ring-1 ring-primary font-medium"
                    : "opacity-70 hover:opacity-100"
                )}
                style={{
                  backgroundColor: tag.color + (isSelected ? '33' : '15'),
                  color: tag.color,
                  borderColor: tag.color + (isSelected ? '66' : '33'),
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
