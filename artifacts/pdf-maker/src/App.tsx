import React, { useState, useCallback, useRef, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Settings, ImageItem, generatePDF } from '@/lib/pdf-gen';
import { SettingsSidebar } from '@/components/SettingsSidebar';
import { SortableImageCard } from '@/components/SortableImageCard';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, Layers, Plus, Trash2, DownloadCloud, Image as ImageIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

const queryClient = new QueryClient();

function PDFMaker() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<Settings>({
    pageSize: 'ipad',
    customWidth: 768,
    customHeight: 1024,
    backgroundColor: '#ffffff',
    orientation: 'portrait',
    marginV: 20,
    marginH: 20,
  });
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keep a ref to latest images so the unmount cleanup can revoke all URLs
  const imagesRef = useRef<ImageItem[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Revoke all object URLs when the component unmounts
  useEffect(() => {
    return () => {
      imagesRef.current.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => 
      f.type.startsWith('image/jpeg') || 
      f.type.startsWith('image/png') || 
      f.type.startsWith('image/webp') || 
      f.type.startsWith('image/gif')
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Unsupported files",
        description: "Only JPG, PNG, WEBP, and GIF formats are supported.",
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      const newImages = validFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  }, [toast]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const moveImage = useCallback((id: string, direction: -1 | 1) => {
    setImages(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      return arrayMove(prev, idx, newIdx);
    });
  }, []);

  const clearAll = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  }, [images]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generate = async () => {
    if (images.length === 0) return;

    // 사용자 제스처 컨텍스트가 살아있는 동기 시점에 창을 미리 열어둠.
    // iOS Safari는 await 이후 window.open을 팝업 차단하기 때문.
    const pdfWindow = window.open('', '_blank');

    try {
      setIsGenerating(true);
      setProgress(0);
      
      const pdfBytes = await generatePDF(images, settings, (current, total) => {
        setProgress((current / total) * 100);
      });
      
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (pdfWindow) {
        pdfWindow.location.href = url;
      } else {
        // 팝업이 차단된 경우 현재 창에서 열기
        window.location.href = url;
      }

      setTimeout(() => URL.revokeObjectURL(url), 30000);
      
      toast({
        title: "완료",
        description: "PDF가 성공적으로 생성되어 다운로드됩니다.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "오류",
        description: "PDF 생성 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-background text-foreground font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border bg-sidebar flex flex-col z-10 shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-foreground">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="font-semibold tracking-tight text-lg">PDF 만들기</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">이미지를 모아 PDF로 변환합니다.</p>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <SettingsSidebar settings={settings} onSettingsChange={setSettings} />
        </ScrollArea>
        
        <div className="p-6 border-t border-sidebar-border bg-sidebar-accent/50 space-y-4 shrink-0">
          {isGenerating ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>PDF 생성 중...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : (
            <Button 
              size="lg" 
              className="w-full h-12 shadow-sm font-semibold text-sm hover-elevate" 
              onClick={generate}
              disabled={images.length === 0}
            >
              <DownloadCloud className="mr-2 h-5 w-5" />
              PDF 생성
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className="flex-1 relative flex flex-col h-[100dvh] md:h-auto overflow-hidden bg-muted/20"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileInputChange} 
          multiple 
          accept="image/png, image/jpeg, image/webp, image/gif" 
          className="hidden" 
        />

        {isDraggingOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary m-4 rounded-2xl transition-all">
            <div className="flex flex-col items-center p-8 bg-background rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
              <UploadCloud className="h-12 w-12 text-primary mb-4" />
              <p className="text-lg font-semibold text-foreground">이미지를 여기에 놓으세요</p>
              <p className="text-sm text-muted-foreground mt-1">파일이 목록에 추가됩니다</p>
            </div>
          </div>
        )}

        {images.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-muted-foreground/25 rounded-3xl bg-background/50 text-center hover:bg-background/80 hover:border-primary/50 transition-colors cursor-pointer group" onClick={triggerFileInput}>
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">시작하기</h2>
              <p className="text-sm text-muted-foreground mb-8">
                이미지를 여기에 끌어다 놓거나 클릭하여 선택하세요. JPG, PNG, WEBP, GIF를 지원합니다.
              </p>
              <Button onClick={(e) => { e.stopPropagation(); triggerFileInput(); }} variant="secondary" className="hover-elevate">
                <Plus className="mr-2 h-4 w-4" />
                이미지 선택
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between p-4 px-6 border-b bg-background/80 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">이미지 {images.length}장</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={triggerFileInput} className="hover-elevate">
                  <Plus className="mr-2 h-4 w-4" />
                  추가
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  전체 삭제
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={images.map(img => img.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-20">
                    {images.map((item, index) => (
                      <SortableImageCard 
                        key={item.id} 
                        item={item} 
                        index={index}
                        total={images.length}
                        onRemove={removeImage}
                        onMoveBack={(id) => moveImage(id, -1)}
                        onMoveForward={(id) => moveImage(id, 1)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>
        )}
      </main>

    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PDFMaker} />
      <Route>
        <div className="flex min-h-screen items-center justify-center">
          404 Not Found
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;