import React from 'react';
import { Settings, PageSize, Orientation } from '@/lib/pdf-gen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Square, RectangleHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface SettingsSidebarProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export function SettingsSidebar({ settings, onSettingsChange }: SettingsSidebarProps) {
  
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Page Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 flex flex-col gap-6">
        
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Size</Label>
          <Select 
            value={settings.pageSize} 
            onValueChange={(v) => updateSetting('pageSize', v as PageSize)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ipad">iPad (768 × 1024)</SelectItem>
              <SelectItem value="ipad-pro-11">iPad Pro 11" (834 × 1194)</SelectItem>
              <SelectItem value="ipad-pro-13">iPad Pro 13" (1024 × 1366)</SelectItem>
              <SelectItem value="a4">A4 (595 × 842)</SelectItem>
              <SelectItem value="letter">Letter (612 × 792)</SelectItem>
              <SelectItem value="custom">Custom Size</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.pageSize === 'custom' && (
          <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="space-y-2">
              <Label className="text-xs">Width (pt)</Label>
              <Input 
                type="number" 
                value={settings.customWidth} 
                onChange={(e) => updateSetting('customWidth', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Height (pt)</Label>
              <Input 
                type="number" 
                value={settings.customHeight} 
                onChange={(e) => updateSetting('customHeight', Number(e.target.value))}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Orientation</Label>
          <ToggleGroup 
            type="single" 
            value={settings.orientation} 
            onValueChange={(v) => { if (v) updateSetting('orientation', v as Orientation) }}
            className="justify-start"
          >
            <ToggleGroupItem value="portrait" aria-label="Portrait" className="flex-1 border bg-background hover:bg-muted data-[state=on]:bg-primary/10 data-[state=on]:border-primary data-[state=on]:text-primary">
              <Square className="h-4 w-4 mr-2" />
              Portrait
            </ToggleGroupItem>
            <ToggleGroupItem value="landscape" aria-label="Landscape" className="flex-1 border bg-background hover:bg-muted data-[state=on]:bg-primary/10 data-[state=on]:border-primary data-[state=on]:text-primary">
              <RectangleHorizontal className="h-4 w-4 mr-2" />
              Landscape
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Background</Label>
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-md border shadow-sm">
              <input 
                type="color" 
                value={settings.backgroundColor} 
                onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                className="absolute -inset-2 h-14 w-14 cursor-pointer p-0 border-0"
              />
            </div>
            <Input 
              value={settings.backgroundColor} 
              onChange={(e) => updateSetting('backgroundColor', e.target.value)}
              className="h-10 flex-1 uppercase text-xs font-mono"
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}