
import { ImageState, ColorChannel, ColorAdjustment, MaskSettings, MaskLayer } from '../types';

// Helper to clamp values
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Declare global UTIF
declare const UTIF: any;

/**
 * Helper to convert a Blob to an HTMLImageElement
 */
const blobToImage = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url); // Clean up memory
            resolve(img);
        };
        img.onerror = (e) => {
             URL.revokeObjectURL(url);
             reject(e);
        };
        img.src = url;
    });
};

/**
 * Decodes a RAW file (DNG, CR2, NEF, etc) using UTIF.js
 */
export const loadRawImage = async (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) throw new Error("No buffer read");

        const ifds = UTIF.decode(buffer);
        if (!ifds || ifds.length === 0) {
          throw new Error("Could not decode RAW structure");
        }

        const candidates: any[] = [];
        const traverse = (list: any[]) => {
            if (!list) return;
            list.forEach(ifd => {
                if (!ifd.width && ifd.t256) ifd.width = ifd.t256[0];
                if (!ifd.height && ifd.t257) ifd.height = ifd.t257[0];
                candidates.push(ifd);
                if (ifd.subIFD) traverse(ifd.subIFD);
            });
        };
        traverse(ifds);

        candidates.sort((a, b) => {
            const areaA = (a.width || 0) * (a.height || 0);
            const areaB = (b.width || 0) * (b.height || 0);
            return areaB - areaA;
        });

        for (const ifd of candidates) {
             if (ifd.t513 && ifd.t513[0] && ifd.t514 && ifd.t514[0]) {
                 const offset = ifd.t513[0];
                 const length = ifd.t514[0];
                 if (offset + length <= buffer.byteLength) {
                     try {
                        const blob = new Blob([new Uint8Array(buffer, offset, length)], { type: 'image/jpeg' });
                        const img = await blobToImage(blob);
                        if (img.width > 100 && img.height > 100) return resolve(img);
                     } catch (err) { console.warn(err); }
                 }
             }

             const compression = ifd.t259 ? ifd.t259[0] : 1;
             if (compression === 6 && ifd.t273 && ifd.t273.length === 1 && ifd.t279 && ifd.t279.length === 1) {
                 const offset = ifd.t273[0];
                 const length = ifd.t279[0];
                 if (offset + length <= buffer.byteLength) {
                     try {
                        const blob = new Blob([new Uint8Array(buffer, offset, length)], { type: 'image/jpeg' });
                        const img = await blobToImage(blob);
                        if (img.width > 100 && img.height > 100) return resolve(img);
                     } catch (err) { console.warn(err); }
                 }
             }

             try {
                UTIF.decodeImage(buffer, ifd);
                const rgba = UTIF.toRGBA8(ifd);
                if (rgba && ifd.width > 0 && ifd.height > 0) {
                    const canvas = document.createElement('canvas');
                    canvas.width = ifd.width;
                    canvas.height = ifd.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const imageData = new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height);
                        ctx.putImageData(imageData, 0, 0);
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = canvas.toDataURL('image/jpeg', 0.9);
                        return;
                    }
                }
             } catch (err) { }
        }
        throw new Error("Failed to decode RAW pixel data from any IFD");
      } catch (err) {
        console.error("RAW Decoding Error:", err);
        reject(err);
      }
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// Convolution helper for sharpening
const applyConvolution = (data: Uint8ClampedArray, width: number, height: number, kernel: number[]) => {
  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);
  const src = new Uint8ClampedArray(data);
  const w = width;
  const h = height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dstOff = (y * w + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
            const srcOff = (scy * w + scx) * 4;
            const wt = kernel[cy * side + cx];
            r += src[srcOff] * wt;
            g += src[srcOff + 1] * wt;
            b += src[srcOff + 2] * wt;
          }
        }
      }
      data[dstOff] = clamp(r, 0, 255);
      data[dstOff + 1] = clamp(g, 0, 255);
      data[dstOff + 2] = clamp(b, 0, 255);
    }
  }
};

// Color Grade Utils
const CHANNEL_HUES: Record<ColorChannel, number> = {
    red: 0,
    orange: 30,
    yellow: 60,
    green: 120,
    aqua: 180,
    blue: 240,
    purple: 280,
    magenta: 320
};
const CHANNELS: ColorChannel[] = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];

const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s, l];
};

const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
};

const hslToRgb = (h: number, s: number, l: number) => {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        h /= 360;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
};

/**
 * Core pixel processing logic for basic Light/Color/Structure adjustments.
 */
const applySinglePixel = (
    r: number, g: number, b: number,
    params: {
        brightness: number;
        contrast: number;
        saturation: number;
        ambiance?: number;
        warmth: number;
        tint: number;
        highlights?: number;
        shadows?: number;
        structure?: number;
    }
) : [number, number, number] => {
    
    // 1. Ambiance (Global only usually, but supported here)
    if (params.ambiance && params.ambiance !== 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const target = params.ambiance > 0 ? 200 : 50;
        const strength = Math.abs(params.ambiance / 100);
        r = r + (target - lum) * strength * 0.5;
        g = g + (target - lum) * strength * 0.5;
        b = b + (target - lum) * strength * 0.5;
    }

    // 2. Brightness
    if (params.brightness !== 0) {
        const brightnessOffset = params.brightness * 2.55;
        r += brightnessOffset;
        g += brightnessOffset;
        b += brightnessOffset;
    }

    // 3. Contrast
    if (params.contrast !== 0) {
        const contrastFactor = (259 * (params.contrast + 255)) / (255 * (259 - params.contrast));
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
    }

    // 4. Highlights & Shadows
    if ((params.highlights && params.highlights !== 0) || (params.shadows && params.shadows !== 0)) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (params.shadows && params.shadows !== 0) {
            const shadowMask = Math.max(0, (128 - lum) / 128);
            const lift = (params.shadows / 100) * 60 * shadowMask;
            r += lift; g += lift; b += lift;
        }
        if (params.highlights && params.highlights !== 0) {
            const highlightMask = Math.max(0, (lum - 128) / 128);
            const dim = (params.highlights / 100) * 60 * highlightMask;
            r += dim; g += dim; b += dim;
        }
    }

    // 5. Structure
    if (params.structure && params.structure !== 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const diff = lum - 128;
        const midtoneMask = Math.max(0, 1 - Math.abs(diff) / 128);
        const factor = 1 + ((params.structure / 100) * midtoneMask);
        r = 128 + (r - 128) * factor;
        g = 128 + (g - 128) * factor;
        b = 128 + (b - 128) * factor;
    }

    // 6. Saturation
    if (params.saturation !== 0) {
        const satMultiplier = 1 + (params.saturation / 100);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = lum + (r - lum) * satMultiplier;
        g = lum + (g - lum) * satMultiplier;
        b = lum + (b - lum) * satMultiplier;
    }

    // 7. Warmth & Tint
    if (params.warmth !== 0 || params.tint !== 0) {
        const warmth = params.warmth / 100;
        const tint = params.tint / 100;
        r += warmth * 30;
        b -= warmth * 30;
        g -= tint * 30;
        r += tint * 10;
        b += tint * 10;
    }

    return [r, g, b];
}

/**
 * Core Color Grading Logic.
 * Applies selective HSL adjustments based on defined channel ranges.
 */
const applyColorGrading = (
    r: number, g: number, b: number,
    channelDefs: { hue: number, adj: ColorAdjustment }[]
): [number, number, number] => {
    // Clamp input to valid range
    r = clamp(r, 0, 255); 
    g = clamp(g, 0, 255); 
    b = clamp(b, 0, 255);

    let [h, s, l] = rgbToHsl(r, g, b);
    
    // Weights to prevent coloring neutrals (black/white/gray)
    let satWeight = 0;
    if (s > 0.02) {
        satWeight = (s - 0.02) * 10; 
        if (satWeight > 1) satWeight = 1;
    }
    let lumWeight = 0;
    if (l > 0.02) {
        lumWeight = (l - 0.02) * 8;
        if (lumWeight > 1) lumWeight = 1;
    }
    const mask = satWeight * lumWeight;
    
    // If pixel has enough color/light to be graded
    if (mask > 0.01) { 
        let totalHAdj = 0, totalSAdj = 0, totalLAdj = 0;
        
        // Find active hue range and interpolate adjustment
        for (let k = 0; k < channelDefs.length; k++) {
            const current = channelDefs[k];
            const next = channelDefs[(k + 1) % channelDefs.length];
            let h1 = current.hue;
            let h2 = next.hue;
            let pixelH = h;
            
            // Handle hue wrapping (350 to 10, etc)
            if (h2 < h1) h2 += 360;
            if (pixelH < h1) pixelH += 360;

            if (pixelH >= h1 && pixelH <= h2) {
                const dist = h2 - h1;
                const w2 = (pixelH - h1) / dist;
                const w1 = 1 - w2;
                
                if (current.adj.hue !== 0 || current.adj.saturation !== 0 || current.adj.luminance !== 0) {
                    totalHAdj += current.adj.hue * w1;
                    totalSAdj += current.adj.saturation * w1;
                    totalLAdj += current.adj.luminance * w1;
                }
                if (next.adj.hue !== 0 || next.adj.saturation !== 0 || next.adj.luminance !== 0) {
                    totalHAdj += next.adj.hue * w2;
                    totalSAdj += next.adj.saturation * w2;
                    totalLAdj += next.adj.luminance * w2;
                }
                break;
            }
        }

        // Apply weighted adjustments
        totalHAdj *= mask; 
        totalSAdj *= mask; 
        totalLAdj *= mask;

        h = (h + totalHAdj) % 360;
        if (h < 0) h += 360;

        const sAdj = totalSAdj / 100;
        if (sAdj > 0) s = s + (1 - s) * sAdj; else s = s + s * sAdj;
        s = clamp(s, 0, 1);

        const lAdj = totalLAdj / 100;
        if (lAdj > 0) l = l + (1 - l) * lAdj; else l = l + l * lAdj;
        l = clamp(l, 0, 1);

        [r, g, b] = hslToRgb(h, s, l);
    }

    return [r, g, b];
};

export const processImage = async (
  sourceImage: HTMLImageElement,
  state: ImageState,
  quality: 'preview' | 'full' = 'preview'
): Promise<ImageData> => {
  
  // 0. Prepare Source (Handle Cropping first)
  let sourceCanvas: HTMLImageElement | HTMLCanvasElement = sourceImage;
  let srcWidth = sourceImage.naturalWidth;
  let srcHeight = sourceImage.naturalHeight;

  if (state.crop) {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = state.crop.width;
      cropCanvas.height = state.crop.height;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
          cropCtx.drawImage(
              sourceImage, 
              state.crop.x, state.crop.y, state.crop.width, state.crop.height, 
              0, 0, cropCanvas.width, cropCanvas.height
          );
          sourceCanvas = cropCanvas;
          srcWidth = cropCanvas.width;
          srcHeight = cropCanvas.height;
      }
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) throw new Error("Could not get canvas context");

  // 1. Handle Geometry & Scaling
  let width = srcWidth;
  let height = srcHeight;

  if (quality === 'preview') {
    const maxDim = 1200;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
  }

  const isRotated90 = state.rotation % 180 !== 0;
  const baseWidth = isRotated90 ? height : width;
  const baseHeight = isRotated90 ? width : height;

  canvas.width = baseWidth;
  canvas.height = baseHeight;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  
  const totalRotationRad = ((state.rotation + state.straighten) * Math.PI) / 180;
  ctx.rotate(totalRotationRad);
  
  if (state.flipH) ctx.scale(-1, 1);
  if (state.flipV) ctx.scale(1, -1);

  if (state.constrain && state.straighten !== 0) {
      const rad = Math.abs((state.straighten * Math.PI) / 180);
      const scale = 1 + Math.sin(rad) * 1.2;
      ctx.scale(scale, scale);
  }
  
  ctx.drawImage(sourceCanvas, -width / 2, -height / 2, width, height);
  ctx.restore();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const len = data.length;

  // --- Pre-processing Masks ---
  const maskDataList: { 
      opacity: Uint8ClampedArray, 
      settings: MaskSettings,
      channelDefs: { hue: number, adj: ColorAdjustment }[],
      isColorGradingActive: boolean
  }[] = [];
  
  if (state.masks.length > 0) {
      const mCanvas = document.createElement('canvas');
      mCanvas.width = canvas.width;
      mCanvas.height = canvas.height;
      const mCtx = mCanvas.getContext('2d');

      if (mCtx) {
          for (const mask of state.masks) {
              if (!mask.isVisible) continue;
              
              mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
              mCtx.drawImage(mask.maskCanvas, 0, 0, mCanvas.width, mCanvas.height);
              const mData = mCtx.getImageData(0, 0, mCanvas.width, mCanvas.height).data;
              
              // Pre-compute channel definitions for this mask to save time in pixel loop
              const hasColorGrading = Object.values(mask.settings.colorGrade).some(c => c.hue !== 0 || c.saturation !== 0 || c.luminance !== 0);
              const maskChannelDefs = hasColorGrading 
                ? CHANNELS.map(key => ({
                    hue: CHANNEL_HUES[key],
                    adj: mask.settings.colorGrade[key]
                  })).sort((a, b) => a.hue - b.hue)
                : [];

              maskDataList.push({
                  opacity: mData,
                  settings: mask.settings,
                  channelDefs: maskChannelDefs,
                  isColorGradingActive: hasColorGrading
              });
          }
      }
  }

  // --- Pre-calc Global Constants ---
  const dehaze = state.dehaze / 100;
  const grainAmount = state.grain * 0.5;

  // Precompute Global Color Grading definitions
  const isColorGradingActive = Object.values(state.colorGrade).some(c => c.hue !== 0 || c.saturation !== 0 || c.luminance !== 0);
  const globalChannelDefs = CHANNELS.map(key => ({
      hue: CHANNEL_HUES[key],
      adj: state.colorGrade[key]
  })).sort((a, b) => a.hue - b.hue);

  // --- Pixel Loop ---
  for (let i = 0; i < len; i += 4) {
    if (data[i+3] === 0) continue;

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // A. GLOBAL ADJUSTMENTS
    [r, g, b] = applySinglePixel(r, g, b, {
        brightness: state.brightness,
        contrast: state.contrast,
        saturation: state.saturation,
        ambiance: state.ambiance,
        warmth: state.warmth,
        tint: state.tint,
        highlights: state.highlights,
        shadows: state.shadows,
        structure: state.structure
    });

    // B. LOCAL MASK ADJUSTMENTS
    for (const mask of maskDataList) {
        // Check mask opacity for this pixel (Alpha channel is i+3)
        const alpha = mask.opacity[i + 3];
        
        if (alpha > 0) {
            const blend = alpha / 255;
            
            // Calculate what the pixel would look like with the local adjustments
            // Note: We apply local adjustments ON TOP of the current pixel state
            // 1. Basic Adjustments
            let [lr, lg, lb] = applySinglePixel(r, g, b, {
                brightness: mask.settings.brightness || 0,
                contrast: mask.settings.contrast || 0,
                saturation: mask.settings.saturation || 0,
                ambiance: 0,
                warmth: mask.settings.warmth || 0,
                tint: mask.settings.tint || 0,
                highlights: 0, 
                shadows: 0,
                structure: mask.settings.structure || 0
            });

            // 2. Local Color Grading
            if (mask.isColorGradingActive) {
                 [lr, lg, lb] = applyColorGrading(lr, lg, lb, mask.channelDefs);
            }

            // 3. Blend
            r = r * (1 - blend) + lr * blend;
            g = g * (1 - blend) + lg * blend;
            b = b * (1 - blend) + lb * blend;
        }
    }

    // C. EFFECTS (Dehaze, Color Grade, Grain) - usually applied last
    
    // 5. Dehaze
    if (dehaze !== 0) {
        const remove = dehaze * 50;
        const factor = 1 / (1 - dehaze * 0.3);
        r = (r - remove) * factor;
        g = (g - remove) * factor;
        b = (b - remove) * factor;
    }

    // 6. Global Color Grading
    if (isColorGradingActive) {
        [r, g, b] = applyColorGrading(r, g, b, globalChannelDefs);
    }

    // 7. Grain
    if (grainAmount > 0) {
        const noise = (Math.random() - 0.5) * grainAmount;
        r += noise;
        g += noise;
        b += noise;
    }

    data[i] = clamp(r, 0, 255);
    data[i + 1] = clamp(g, 0, 255);
    data[i + 2] = clamp(b, 0, 255);
  }

  // Apply Sharpening
  if (state.sharpening > 0) {
    const alpha = state.sharpening / 100; 
    const center = 1 + 4 * alpha;
    const neigh = -alpha;
    const kernel = [0, neigh, 0, neigh, center, neigh, 0, neigh, 0];
    applyConvolution(data, canvas.width, canvas.height, kernel);
  }

  ctx.putImageData(imageData, 0, 0);

  // Apply Vignette
  if (state.vignette > 0) {
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.8
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${state.vignette / 100})`);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

export const generateResultUrl = async (source: HTMLImageElement, state: ImageState): Promise<string> => {
    const imageData = await processImage(source, state, 'full');
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.95);
    }
    return '';
};

export const getClosestColorChannel = (r: number, g: number, b: number): ColorChannel => {
    const [h] = rgbToHsl(r, g, b);
    
    // Find closest channel center
    let minDiff = 360;
    let closest: ColorChannel = 'red';
    
    for (const channel of CHANNELS) {
        let diff = Math.abs(h - CHANNEL_HUES[channel]);
        if (diff > 180) diff = 360 - diff; // Handle wrap
        if (diff < minDiff) {
            minDiff = diff;
            closest = channel;
        }
    }
    return closest;
};
