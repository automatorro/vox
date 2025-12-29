import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Category } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export const CategoryFilter = ({
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryFilterProps) => {
  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedCategoryId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(null)}
            className="rounded-full text-xs h-7"
          >
            Toate
          </Button>
          
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(cat.id)}
              className={cn(
                "rounded-full text-xs h-7 gap-1.5",
                selectedCategoryId === cat.id && "pr-1"
              )}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
              {selectedCategoryId === cat.id && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(null);
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-background/20"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
