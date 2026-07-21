import { PDFDocument, rgb } from 'pdf-lib';

export type PageSize = 'ipad' | 'ipad-pro-11' | 'ipad-pro-13' | 'a4' | 'letter' | 'custom';
export type Orientation = 'portrait' | 'landscape';

export type Settings = {
  pageSize: PageSize;
  customWidth: number;
  customHeight: number;
  backgroundColor: string;
  orientation: Orientation;
  marginV: number;
  marginL: number;
  marginR: number;
};

export type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

const PAGE_DIMENSIONS = {
  'ipad': { w: 768, h: 1024 },
  'ipad-pro-11': { w: 834, h: 1194 },
  'ipad-pro-13': { w: 1024, h: 1366 },
  'a4': { w: 595, h: 842 },
  'letter': { w: 612, h: 792 },
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

function loadAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

async function fileToPngBuffer(file: File): Promise<ArrayBuffer> {
  const img = await loadAsImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(img, 0, 0);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (blob) {
        resolve(await blob.arrayBuffer());
      } else {
        reject(new Error("Canvas to Blob failed"));
      }
    }, 'image/png');
  });
}

export async function generatePDF(images: ImageItem[], settings: Settings, onProgress: (current: number, total: number) => void): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  let baseW = 0;
  let baseH = 0;
  
  if (settings.pageSize === 'custom') {
    baseW = settings.customWidth;
    baseH = settings.customHeight;
  } else {
    baseW = PAGE_DIMENSIONS[settings.pageSize].w;
    baseH = PAGE_DIMENSIONS[settings.pageSize].h;
  }
  
  const pageW = settings.orientation === 'portrait' ? baseW : baseH;
  const pageH = settings.orientation === 'portrait' ? baseH : baseW;
  
  const bgColor = hexToRgb(settings.backgroundColor) || { r: 1, g: 1, b: 1 };
  const mV = Math.max(0, settings.marginV ?? 0);
  const mL = Math.max(0, settings.marginL ?? 0);
  const mR = Math.max(0, settings.marginR ?? 0);
  // Drawable area after applying margins
  const drawW = pageW - mL - mR;
  const drawH = pageH - mV * 2;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];

    const arrayBuffer = await item.file.arrayBuffer();

    let embeddedImage;
    if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
    } else if (item.file.type === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(arrayBuffer);
    } else {
      // WEBP, GIF or others -> lossless PNG via canvas (no quality loss)
      const pngBuffer = await fileToPngBuffer(item.file);
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    const page = pdfDoc.addPage([pageW, pageH]);

    // Fill background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    });

    const imgW = embeddedImage.width;
    const imgH = embeddedImage.height;

    const imgRatio = imgW / imgH;
    const drawRatio = drawW / drawH;

    let scaledW, scaledH, x, y;

    if (imgRatio > drawRatio) {
      // wider than drawable area → fit width, top-align
      scaledW = drawW;
      scaledH = imgH * (drawW / imgW);
      x = mL;
      // pdf-lib y=0 is bottom; top-align = place at top of drawable area
      y = mV + drawH - scaledH;
    } else {
      // taller → fit height, center horizontally
      scaledH = drawH;
      scaledW = imgW * (drawH / imgH);
      x = mL + (drawW - scaledW) / 2;
      y = mV;
    }

    page.drawImage(embeddedImage, { x, y, width: scaledW, height: scaledH });

    onProgress(i + 1, images.length);
  }
  
  return await pdfDoc.save();
}