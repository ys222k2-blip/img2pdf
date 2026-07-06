import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageItem } from '@/lib/pdf-gen';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SortableImageCardProps {
  item: ImageItem;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMoveBack: (id: string) => void;
  onMoveForward: (id: string) => void;
}

export function SortableImageCard({ item, index, total, onRemove, onMoveBack, onMoveForward }: SortableImageCardProps) {
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

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? 'opacity-50 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg' : ''
      }`}
    >
      {/* Page number badge — top left */}
      <Badge
        className="absolute left-2 top-2 z-10 shadow-sm pointer-events-none bg-background/90 text-foreground backdrop-blur-md hover:bg-background/90 tabular-nums"
        variant="outline"
      >
        {index + 1}
      </Badge>

      {/* Delete button — top right, always visible */}
      <button
        className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-opacity hover:opacity-80 active:scale-95"
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        aria-label="삭제"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Image preview */}
      <div
        {...attributes}
        {...listeners}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted/50 border border-muted flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="h-full w-full object-contain pointer-events-none select-none"
          draggable={false}
        />
      </div>

      {/* File name */}
      <div className="truncate px-1 text-[11px] font-medium text-muted-foreground" title={item.file.name}>
        {item.file.name}
      </div>

      {/* Move back / forward — bottom row, always visible */}
      <div className="flex gap-1">
        <button
          disabled={isFirst}
          className="flex flex-1 items-center justify-center gap-0.5 rounded-md border border-border bg-background py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 active:scale-95"
          onClick={(e) => { e.stopPropagation(); onMoveBack(item.id); }}
          aria-label="Move back"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          disabled={isLast}
          className="flex flex-1 items-center justify-center gap-0.5 rounded-md border border-border bg-background py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 active:scale-95"
          onClick={(e) => { e.stopPropagation(); onMoveForward(item.id); }}
          aria-label="Move forward"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}