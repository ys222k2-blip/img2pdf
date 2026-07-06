import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageItem } from '@/lib/pdf-gen';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SortableImageCardProps {
  item: ImageItem;
  index: number;
  onRemove: (id: string) => void;
}

export function SortableImageCard({ item, index, onRemove }: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? 'opacity-50 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg' : ''
      }`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute left-2 top-2 z-10 flex h-7 w-7 cursor-grab active:cursor-grabbing items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <Badge className="absolute right-2 top-2 z-10 shadow-sm pointer-events-none bg-background/90 text-foreground backdrop-blur-md hover:bg-background/90" variant="outline">
        {index + 1}
      </Badge>
      
      <Button
        variant="destructive"
        size="icon"
        className="absolute -right-2 -top-2 z-20 h-6 w-6 rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted/50 border border-muted flex items-center justify-center pointer-events-none">
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="h-full w-full object-contain pointer-events-none"
        />
      </div>
      <div className="truncate px-1 text-[11px] font-medium text-muted-foreground pointer-events-none" title={item.file.name}>
        {item.file.name}
      </div>
    </div>
  );
}