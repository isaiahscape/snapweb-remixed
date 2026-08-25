
import { ImageState, ColorChannel, ColorAdjustment, MaskSettings, MaskLayer, OverlayItem } from '../types';
import UTIF from 'utif';

// Helper to clamp values
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

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
                        img.src = canvas.toDataURL('image/png');
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

// --- Linear Float RAW Engine Math & LUTs ---

// Standard IEC 61966-2-1 sRGB to Linear conversion
export const sRGBToLinear = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

export const linearToSRGB = (v: number): number => {
  const clamped = Math.max(0, Math.min(1, v));
  const s = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
};

// Fast Lookup Table for sRGB to Linear Float32
const SRGB_TO_LINEAR_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  SRGB_TO_LINEAR_LUT[i] = sRGBToLinear(i);
}

// Narkowicz ACES Filmic Tonemapping (prevents digital highlight blowout in linear HDR)
export const acesTonemap = (x: number): number => {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return Math.max(0, Math.min(1, (x * (a * x + b)) / (x * (c * x + d) + e)));
};

// Planckian Blackbody Radiation (Kelvin + Tint to Linear RGB Multipliers)
export const kelvinToRGBFactors = (kelvin: number, tint: number = 0): [number, number, number] => {
  const temp = Math.max(2000, Math.min(12000, kelvin)) / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
  }

  if (temp <= 66) {
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  }

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Reference D55 (5500K daylight) base normalization
  const baseR = 255, baseG = 240.2, baseB = 224.5;
  let multR = r / baseR;
  let multG = g / baseG;
  let multB = b / baseB;

  if (tint !== 0) {
    const t = tint / 100;
    multG *= (1 - t * 0.25);
    multR *= (1 + t * 0.12);
    multB *= (1 + t * 0.12);
  }

  const lum = 0.2126 * multR + 0.7152 * multG + 0.0722 * multB;
  if (lum > 0.001) {
    multR /= lum;
    multG /= lum;
    multB /= lum;
  }

  return [multR, multG, multB];
};

// 3x3 Camera Sensor Matrices
export const CAMERA_PROFILES: Record<string, number[][]> = {
  Standard: [
    [1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0]
  ],
  Neutral: [
    [0.95, 0.03, 0.02],
    [0.02, 0.96, 0.02],
    [0.02, 0.03, 0.95]
  ],
  Vivid: [
    [1.24, -0.16, -0.08],
    [-0.08, 1.22, -0.14],
    [-0.04, -0.18, 1.22]
  ],
  Landscape: [
    [1.18, -0.10, -0.08],
    [-0.12, 1.26, -0.14],
    [-0.04, -0.16, 1.20]
  ],
  Portrait: [
    [1.12, -0.08, -0.04],
    [-0.04, 1.08, -0.04],
    [-0.02, -0.06, 1.08]
  ],
  Monochrome: [
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722]
  ],
  'Classic Chrome': [
    [1.12, -0.06, -0.06],
    [-0.08, 1.06, -0.03],
    [-0.03, -0.14, 1.17]
  ],
  Velvia: [
    [1.34, -0.22, -0.12],
    [-0.16, 1.38, -0.22],
    [-0.08, -0.24, 1.32]
  ],
  Sunny: [
    [1.06, 0.0, -0.06],
    [0.0, 1.0, 0.0],
    [-0.06, 0.0, 0.94]
  ],
  Cloudy: [
    [1.14, -0.05, -0.09],
    [0.0, 1.02, -0.02],
    [-0.08, -0.02, 0.90]
  ],
  Shade: [
    [1.22, -0.08, -0.14],
    [0.0, 1.04, -0.04],
    [-0.12, -0.04, 0.82]
  ],
  Tungsten: [
    [0.78, 0.05, 0.17],
    [0.0, 0.96, 0.04],
    [0.12, 0.04, 1.28]
  ],
  Fluorescent: [
    [1.08, -0.12, 0.04],
    [0.0, 0.92, 0.08],
    [0.04, -0.06, 1.14]
  ],
  Flash: [
    [1.06, -0.02, -0.04],
    [0.0, 1.0, 0.0],
    [-0.04, 0.0, 0.96]
  ]
};

// Sample neutral gray point for White Balance Eyedropper
export const sampleNeutralWhiteBalance = (
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number = 3
): { kelvin: number; tint: number } => {
  const { data, width, height } = imageData;
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = Math.max(0, Math.min(width - 1, centerX + dx));
      const y = Math.max(0, Math.min(height - 1, centerY + dy));
      const idx = (y * width + x) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
      count++;
    }
  }

  const avgR = totalR / count;
  const avgG = totalG / count;
  const avgB = totalB / count;

  // Compute Kelvin shift relative to neutral
  const rRatio = avgR / (avgG || 1);
  const bRatio = avgB / (avgG || 1);

  // Approximate Kelvin from R/B ratio
  const kelvinEst = Math.round(5500 * (bRatio / (rRatio || 1)));
  const kelvin = Math.max(2000, Math.min(12000, kelvinEst));

  // Compute Tint (Green vs Magenta deviation)
  const tintEst = Math.round(((avgR + avgB) * 0.5 - avgG) * 1.5);
  const tint = Math.max(-100, Math.min(100, tintEst));

  return { kelvin, tint };
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
 * Generates a 256-value Look-Up Table for Curves interpolation
 */
const getCurvesLUT = (points: { x: number; y: number }[]): Uint8Array => {
  const lut = new Uint8Array(256);
  const sorted = [...points].sort((a, b) => a.x - b.x);
  
  if (sorted.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  
  if (sorted[0].x > 0) {
    sorted.unshift({ x: 0, y: sorted[0].y });
  }
  if (sorted[sorted.length - 1].x < 1) {
    sorted.push({ x: 1, y: sorted[sorted.length - 1].y });
  }

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let idx = 0;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (t >= sorted[j].x && t <= sorted[j + 1].x) {
        idx = j;
        break;
      }
    }
    const pA = sorted[idx];
    const pB = sorted[idx + 1];
    let val = pA.y;
    if (pB.x > pA.x) {
      const pct = (t - pA.x) / (pB.x - pA.x);
      val = pA.y + pct * (pB.y - pA.y);
    }
    lut[i] = Math.max(0, Math.min(255, Math.round(val * 255)));
  }
  return lut;
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
        tonalContrast?: number;
        tonalHighTones?: number;
        tonalMidTones?: number;
        tonalLowTones?: number;
        tonalProtectShadows?: number;
        tonalProtectHighlights?: number;
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

    // 5.5. Legacy Tonal Contrast (Multi-band mid, high, low local contrast)
    if (params.tonalContrast && params.tonalContrast !== 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const tcFactor = params.tonalContrast / 100;
        
        // Multi-band weight distributions
        const lowWeight = Math.max(0, 1 - Math.abs(lum - 64) / 96);
        const midWeight = Math.max(0, 1 - Math.abs(lum - 128) / 96);
        const highWeight = Math.max(0, 1 - Math.abs(lum - 192) / 96);
        
        if (lowWeight > 0) {
            const f = 1 + tcFactor * 0.40 * lowWeight;
            r = 64 + (r - 64) * f;
            g = 64 + (g - 64) * f;
            b = 64 + (b - 64) * f;
        }
        if (midWeight > 0) {
            const f = 1 + tcFactor * 0.50 * midWeight;
            r = 128 + (r - 128) * f;
            g = 128 + (g - 128) * f;
            b = 128 + (b - 128) * f;
        }
        if (highWeight > 0) {
            const f = 1 + tcFactor * 0.30 * highWeight;
            r = 192 + (r - 192) * f;
            g = 192 + (g - 192) * f;
            b = 192 + (b - 192) * f;
        }
    }

    // 5.6. Advanced Modern Tonal Contrast (Separate High/Mid/Low with Shadow/Highlight Protection)
    const hasAdvancedTonal = (
        (params.tonalLowTones && params.tonalLowTones !== 0) ||
        (params.tonalMidTones && params.tonalMidTones !== 0) ||
        (params.tonalHighTones && params.tonalHighTones !== 0)
    );

    if (hasAdvancedTonal) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Shadow Protection (dampens adjustment as pixels get darker than 96)
        let shadowDamp = 1.0;
        if (params.tonalProtectShadows && params.tonalProtectShadows > 0) {
            const shadowProximity = Math.max(0, (96 - lum) / 96); // 1.0 at pure black (0), 0.0 at 96+
            shadowDamp = 1.0 - (params.tonalProtectShadows / 100) * shadowProximity;
        }

        // Highlight Protection (dampens adjustment as pixels get brighter than 160)
        let highlightDamp = 1.0;
        if (params.tonalProtectHighlights && params.tonalProtectHighlights > 0) {
            const highlightProximity = Math.max(0, (lum - 160) / 95); // 1.0 at pure white (255), 0.0 at 160-
            highlightDamp = 1.0 - (params.tonalProtectHighlights / 100) * highlightProximity;
        }

        // Low Tones Contrast
        if (params.tonalLowTones && params.tonalLowTones !== 0) {
            const lowWeight = Math.max(0, 1 - Math.abs(lum - 64) / 96);
            if (lowWeight > 0) {
                const factor = 1 + (params.tonalLowTones / 100) * 0.45 * lowWeight * shadowDamp;
                r = 64 + (r - 64) * factor;
                g = 64 + (g - 64) * factor;
                b = 64 + (b - 64) * factor;
            }
        }

        // Mid Tones Contrast
        if (params.tonalMidTones && params.tonalMidTones !== 0) {
            const midWeight = Math.max(0, 1 - Math.abs(lum - 128) / 96);
            if (midWeight > 0) {
                const factor = 1 + (params.tonalMidTones / 100) * 0.55 * midWeight;
                r = 128 + (r - 128) * factor;
                g = 128 + (g - 128) * factor;
                b = 128 + (b - 128) * factor;
            }
        }

        // High Tones Contrast
        if (params.tonalHighTones && params.tonalHighTones !== 0) {
            const highWeight = Math.max(0, 1 - Math.abs(lum - 192) / 96);
            if (highWeight > 0) {
                const factor = 1 + (params.tonalHighTones / 100) * 0.35 * highWeight * highlightDamp;
                r = 192 + (r - 192) * factor;
                g = 192 + (g - 192) * factor;
                b = 192 + (b - 192) * factor;
            }
        }
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

  if (state.crop && state.crop.width > 2 && state.crop.height > 2) {
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
    const maxDim = 1800;
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

  // --- Healing Strokes (Patch / Spot removal) ---
  if (state.healingStrokes && state.healingStrokes.length > 0) {
    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = canvas.width;
    strokeCanvas.height = canvas.height;
    const sCtx = strokeCanvas.getContext('2d');
    
    if (sCtx) {
      for (const stroke of state.healingStrokes) {
        if (stroke.points.length === 0) continue;
        
        sCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
        sCtx.lineCap = 'round';
        sCtx.lineJoin = 'round';
        sCtx.strokeStyle = 'white';
        
        const brushPx = Math.max(4, (stroke.size / 100) * canvas.width);
        sCtx.lineWidth = brushPx;
        sCtx.shadowBlur = brushPx * 0.45;
        sCtx.shadowColor = 'white';
        
        sCtx.beginPath();
        const p0 = stroke.points[0];
        sCtx.moveTo((p0.x / 100) * canvas.width, (p0.y / 100) * canvas.height);
        for (let pIdx = 1; pIdx < stroke.points.length; pIdx++) {
          const pt = stroke.points[pIdx];
          sCtx.lineTo((pt.x / 100) * canvas.width, (pt.y / 100) * canvas.height);
        }
        sCtx.stroke();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
          const offsetDist = Math.max(12, brushPx * 1.5);
          tCtx.drawImage(canvas, -offsetDist, -offsetDist * 0.5);
          tCtx.globalCompositeOperation = 'destination-in';
          tCtx.drawImage(strokeCanvas, 0, 0);
          
          ctx.save();
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.restore();
        }
      }
    }
  }

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

  // --- Pre-calc Linear RAW Engine Constants ---
  const rawKelvin = state.rawKelvin || (5500 + (state.rawTemperature ? state.rawTemperature * 25 : 0));
  const rawTint = (state.rawTint || 0) + (state.rawTemperature ? state.rawTemperature * 0.15 : 0);
  const [wbR, wbG, wbB] = kelvinToRGBFactors(rawKelvin, rawTint);

  const rawExposureFactor = Math.pow(2, state.rawExposureEV || 0);
  const rawHighlightsFactor = (state.rawHighlights || 0) / 100;
  const rawShadowsFactor = (state.rawShadows || 0) / 100;
  const rawWhitesFactor = (state.rawWhites || 0) / 100;
  const rawBlacksFactor = (state.rawBlacks || 0) / 100;
  const rawClarityFactor = (state.rawClarity || 0) / 100;
  const sensorMatrix = CAMERA_PROFILES[state.rawProfile || 'Standard'] || CAMERA_PROFILES.Standard;

  const isRawActive = (state.rawExposureEV || 0) !== 0 ||
                      (state.rawKelvin && state.rawKelvin !== 5500) ||
                      (state.rawTemperature || 0) !== 0 ||
                      (state.rawTint || 0) !== 0 ||
                      (state.rawHighlights || 0) !== 0 ||
                      (state.rawShadows || 0) !== 0 ||
                      (state.rawWhites || 0) !== 0 ||
                      (state.rawBlacks || 0) !== 0 ||
                      (state.rawClarity || 0) !== 0 ||
                      (state.rawProfile && state.rawProfile !== 'Standard');

  // Precompute Global Color Grading definitions
  const isColorGradingActive = Object.values(state.colorGrade).some(c => c.hue !== 0 || c.saturation !== 0 || c.luminance !== 0);
  const globalChannelDefs = CHANNELS.map(key => ({
      hue: CHANNEL_HUES[key],
      adj: state.colorGrade[key]
  })).sort((a, b) => a.hue - b.hue);

  // --- Curves LUTs computation ---
  const curveLUTs = {
    rgb: getCurvesLUT(state.curves?.rgb || [{ x: 0, y: 0 }, { x: 1, y: 1 }]),
    r: getCurvesLUT(state.curves?.r || [{ x: 0, y: 0 }, { x: 1, y: 1 }]),
    g: getCurvesLUT(state.curves?.g || [{ x: 0, y: 0 }, { x: 1, y: 1 }]),
    b: getCurvesLUT(state.curves?.b || [{ x: 0, y: 0 }, { x: 1, y: 1 }])
  };

  // --- Selective Points pre-calculations ---
  const selectivePointsData = (state.selectivePoints || []).map(pt => {
    const cx = clamp(Math.round((pt.x / 100) * canvas.width), 0, canvas.width - 1);
    const cy = clamp(Math.round((pt.y / 100) * canvas.height), 0, canvas.height - 1);
    const pxRadius = (pt.radius / 100) * Math.max(canvas.width, canvas.height);
    
    // Sample color at center point
    const idx = (cy * canvas.width + cx) * 4;
    const tr = data[idx] !== undefined ? data[idx] : 128;
    const tg = data[idx+1] !== undefined ? data[idx+1] : 128;
    const tb = data[idx+2] !== undefined ? data[idx+2] : 128;

    return {
      pt,
      cx,
      cy,
      pxRadius,
      tr, tg, tb
    };
  });

  // --- Lens Blur precomputations ---
  const lbEnabled = state.lensBlur?.enabled && (state.lensBlur?.blurRadius || 0) > 0;
  let blurData: Uint8ClampedArray | null = null;
  if (lbEnabled) {
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = canvas.width;
    blurCanvas.height = canvas.height;
    const bCtx = blurCanvas.getContext('2d');
    if (bCtx) {
      bCtx.filter = `blur(${state.lensBlur.blurRadius * 0.22}px)`;
      bCtx.drawImage(canvas, 0, 0);
      blurData = bCtx.getImageData(0, 0, canvas.width, canvas.height).data;
    }
  }

  // --- HDR Scape & Grainy Film constants ---
  const hdrStrength = state.hdrScape?.strength || 0;
  const hdrBrightness = state.hdrScape?.brightness || 0;
  const hdrSaturation = state.hdrScape?.saturation || 0;
  const hdrStyle = state.hdrScape?.style || 'Nature';

  const gfStrength = state.grainyFilm?.strength || 0;
  const gfGrain = state.grainyFilm?.grain || 0;
  const gfStyle = state.grainyFilm?.style || 'off';

  // --- Pixel Loop ---
  for (let i = 0; i < len; i += 4) {
    if (data[i+3] === 0) continue;

    // --- 0. LINEAR SCENE-REFERRED 32-BIT RAW DEVELOPMENT PIPELINE ---
    let linR = SRGB_TO_LINEAR_LUT[data[i]];
    let linG = SRGB_TO_LINEAR_LUT[data[i + 1]];
    let linB = SRGB_TO_LINEAR_LUT[data[i + 2]];

    if (isRawActive) {
      // a. Physical Exposure EV (Linear optical power scaling)
      if (rawExposureFactor !== 1) {
        linR *= rawExposureFactor;
        linG *= rawExposureFactor;
        linB *= rawExposureFactor;
      }

      // b. Linear Planckian White Balance (Kelvin + Tint)
      linR *= wbR;
      linG *= wbG;
      linB *= wbB;

      // c. 3x3 Camera Sensor Matrix Color Transform
      const mr = linR * sensorMatrix[0][0] + linG * sensorMatrix[0][1] + linB * sensorMatrix[0][2];
      const mg = linR * sensorMatrix[1][0] + linG * sensorMatrix[1][1] + linB * sensorMatrix[1][2];
      const mb = linR * sensorMatrix[2][0] + linG * sensorMatrix[2][1] + linB * sensorMatrix[2][2];
      linR = Math.max(0, mr);
      linG = Math.max(0, mg);
      linB = Math.max(0, mb);

      // d. Linear Highlight Shoulder Recovery & Compression
      if (rawHighlightsFactor !== 0) {
        if (rawHighlightsFactor > 0) {
          if (linR > 0.45) linR = 0.45 + (linR - 0.45) / (1 + (linR - 0.45) * rawHighlightsFactor * 2.2);
          if (linG > 0.45) linG = 0.45 + (linG - 0.45) / (1 + (linG - 0.45) * rawHighlightsFactor * 2.2);
          if (linB > 0.45) linB = 0.45 + (linB - 0.45) / (1 + (linB - 0.45) * rawHighlightsFactor * 2.2);
        } else {
          const boost = Math.abs(rawHighlightsFactor);
          if (linR > 0.45) linR = 0.45 + (linR - 0.45) * (1 + boost * 0.9);
          if (linG > 0.45) linG = 0.45 + (linG - 0.45) * (1 + boost * 0.9);
          if (linB > 0.45) linB = 0.45 + (linB - 0.45) * (1 + boost * 0.9);
        }
      }

      // e. Linear Shadows Toe Expansion (Fill light)
      if (rawShadowsFactor !== 0) {
        const liftShadow = (c: number, s: number) => {
          if (c >= 0.5) return c;
          const w = 1 - c / 0.5;
          return Math.max(0, c + w * w * (s * 0.35));
        };
        linR = liftShadow(linR, rawShadowsFactor);
        linG = liftShadow(linG, rawShadowsFactor);
        linB = liftShadow(linB, rawShadowsFactor);
      }

      // f. Whites & Blacks dynamic range clipping
      if (rawWhitesFactor !== 0) {
        linR *= (1 + rawWhitesFactor * 0.35);
        linG *= (1 + rawWhitesFactor * 0.35);
        linB *= (1 + rawWhitesFactor * 0.35);
      }
      if (rawBlacksFactor !== 0) {
        const offset = rawBlacksFactor * 0.05;
        linR = Math.max(0, linR + offset);
        linG = Math.max(0, linG + offset);
        linB = Math.max(0, linB + offset);
      }

      // g. Micro-contrast / Linear Clarity
      if (rawClarityFactor !== 0) {
        const avgLin = (linR + linG + linB) / 3;
        const midDiff = avgLin - 0.35;
        const cFactor = 1 + rawClarityFactor * 0.4 * (1 - Math.abs(midDiff) * 2);
        linR = Math.max(0, avgLin + (linR - avgLin) * cFactor);
        linG = Math.max(0, avgLin + (linG - avgLin) * cFactor);
        linB = Math.max(0, avgLin + (linB - avgLin) * cFactor);
      }

      // h. ACES Filmic Tonemap to prevent digital clipping
      linR = acesTonemap(linR);
      linG = acesTonemap(linG);
      linB = acesTonemap(linB);
    }

    // Convert Linear back to Display sRGB
    let r = linearToSRGB(linR);
    let g = linearToSRGB(linG);
    let b = linearToSRGB(linB);

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
        structure: state.structure,
        tonalContrast: state.tonalContrast,
        tonalHighTones: state.tonalHighTones,
        tonalMidTones: state.tonalMidTones,
        tonalLowTones: state.tonalLowTones,
        tonalProtectShadows: state.tonalProtectShadows,
        tonalProtectHighlights: state.tonalProtectHighlights
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

    // B.1 SELECTIVE CONTROL POINTS ADJUSTMENTS
    if (selectivePointsData.length > 0) {
      const px = (i / 4) % canvas.width;
      const py = Math.floor((i / 4) / canvas.width);
      
      for (const ptData of selectivePointsData) {
        const dx = px - ptData.cx;
        const dy = py - ptData.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < ptData.pxRadius) {
          let spatialBlend = 1 - dist / ptData.pxRadius;
          spatialBlend = spatialBlend * spatialBlend * (3 - 2 * spatialBlend); // smooth step falloff
          
          // Color similarity weight
          const colorDiff = Math.sqrt((r - ptData.tr)**2 + (g - ptData.tg)**2 + (b - ptData.tb)**2) / 441.67;
          const colorWeight = Math.max(0, 1 - colorDiff * 2.8);
          
          const blend = spatialBlend * colorWeight;
          if (blend > 0) {
            let [lr, lg, lb] = applySinglePixel(r, g, b, {
              brightness: ptData.pt.brightness,
              contrast: ptData.pt.contrast,
              saturation: ptData.pt.saturation,
              structure: ptData.pt.structure,
              ambiance: 0, warmth: 0, tint: 0
            });
            r = r * (1 - blend) + lr * blend;
            g = g * (1 - blend) + lg * blend;
            b = b * (1 - blend) + lb * blend;
          }
        }
      }
    }

    // B.2 HDR SCAPE EFFECT
    if (hdrStrength > 0) {
       const hdrBoost = hdrStrength / 100;
       const lum = 0.299 * r + 0.587 * g + 0.114 * b;
       
       // 1. Shadow boost
       if (lum < 130) {
          const shadowMask = (130 - lum) / 130;
          const lift = (130 - lum) * 0.45 * hdrBoost * shadowMask;
          r += lift; g += lift; b += lift;
       }
       
       // 2. Highlight recovery
       if (lum > 170) {
          const highlightMask = (lum - 170) / (255 - 170);
          const compress = (lum - 170) * 0.4 * hdrBoost * highlightMask;
          r -= compress; g -= compress; b -= compress;
       }

       // 3. Local detail/structure booster
       let detailScale = 1.0 + hdrBoost * 0.22;
       if (hdrStyle === 'Fine') detailScale = 1.0 + hdrBoost * 0.38;
       if (hdrStyle === 'Strong') detailScale = 1.0 + hdrBoost * 0.48;
       if (hdrStyle === 'People') detailScale = 1.0 + hdrBoost * 0.10;
       
       r = 128 + (r - 128) * detailScale;
       g = 128 + (g - 128) * detailScale;
       b = 128 + (b - 128) * detailScale;
       
       // 4. Custom HDR saturation & brightness controls
       let satFactor = 1.0 + hdrBoost * 0.24 + (hdrSaturation / 100) * 0.55;
       if (hdrStyle === 'People') satFactor = 1.0 + (hdrSaturation / 100) * 0.35;
       
       const finalLum = 0.299 * r + 0.587 * g + 0.114 * b;
       const brightLift = hdrBrightness * 0.65;
       r = finalLum + (r - finalLum) * satFactor + brightLift;
       g = finalLum + (g - finalLum) * satFactor + brightLift;
       b = finalLum + (b - finalLum) * satFactor + brightLift;
    }

    // B.3 CURVES TONAL MAPPING
    r = curveLUTs.r[clamp(Math.round(r), 0, 255)];
    g = curveLUTs.g[clamp(Math.round(g), 0, 255)];
    b = curveLUTs.b[clamp(Math.round(b), 0, 255)];

    r = curveLUTs.rgb[clamp(Math.round(r), 0, 255)];
    g = curveLUTs.rgb[clamp(Math.round(g), 0, 255)];
    b = curveLUTs.rgb[clamp(Math.round(b), 0, 255)];

    // B.4 GRAINY FILM STYLES
    if (gfStyle !== 'off' && gfStrength > 0) {
       const factor = gfStrength / 100;
       let targetR = r;
       let targetG = g;
       let targetB = b;
       
       if (gfStyle === 'X01') {
          targetR = r * 0.94;
          targetG = g * 1.01;
          targetB = b * 1.09;
          targetR = 128 + (targetR - 128) * 1.15;
          targetG = 128 + (targetG - 128) * 1.15;
          targetB = 128 + (targetB - 128) * 1.15;
       } else if (gfStyle === 'X02') {
          targetR = r * 1.09;
          targetG = g * 1.05;
          targetB = b * 0.88;
       } else if (gfStyle === 'L01') {
          targetR = r * 0.88 + 22;
          targetG = g * 0.88 + 22;
          targetB = b * 0.94 + 18;
          targetR = 128 + (targetR - 128) * 0.82;
          targetG = 128 + (targetG - 128) * 0.82;
          targetB = 128 + (targetB - 128) * 0.82;
       } else if (gfStyle === 'L02') {
          const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
          const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
          const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
          targetR = sepiaR; targetG = sepiaG; targetB = sepiaB;
       } else if (gfStyle === 'F01') {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          targetR = lum + (r - lum) * 1.35;
          targetG = lum + (g - lum) * 1.45;
          targetB = lum + (b - lum) * 1.15;
       } else if (gfStyle === 'F02') {
          targetR = r * 1.03;
          targetG = g * 0.97;
          targetB = b * 1.07;
       } else if (gfStyle === 'K01') {
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          targetR = targetG = targetB = clamp(lum * 0.9 + 12, 0, 255);
       } else if (gfStyle === 'K02') {
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          targetR = targetG = targetB = clamp(128 + (lum - 128) * 1.45, 0, 255);
       }
       
       r = r * (1 - factor) + targetR * factor;
       g = g * (1 - factor) + targetG * factor;
       b = b * (1 - factor) + targetB * factor;
    }

    // B.5 LENS BLUR EFFECT
    if (lbEnabled && blurData) {
       const cx = (state.lensBlur.x / 100) * canvas.width;
       const cy = (state.lensBlur.y / 100) * canvas.height;
       const px = (i / 4) % canvas.width;
       const py = Math.floor((i / 4) / canvas.width);
       
       const innerPx = (state.lensBlur.innerRadius / 100) * Math.max(canvas.width, canvas.height);
       const outerPx = innerPx + (state.lensBlur.transitionSize / 100) * Math.max(canvas.width, canvas.height);
       let dist = 0;
       
       if (state.lensBlur.shape === 'linear') {
          const theta = (state.lensBlur.angle * Math.PI) / 180;
          dist = Math.abs((px - cx) * Math.cos(theta) + (py - cy) * Math.sin(theta));
       } else {
          dist = Math.sqrt((px - cx)**2 + (py - cy)**2);
       }
       
       let f = 0;
       if (dist >= outerPx) {
          f = 1;
       } else if (dist > innerPx) {
          f = (dist - innerPx) / (outerPx - innerPx);
          f = f * f * (3 - 2 * f); // smoothstep
       }
       
       r = r * (1 - f) + blurData[i] * f;
       g = g * (1 - f) + blurData[i + 1] * f;
       b = b * (1 - f) + blurData[i + 2] * f;
       
       // Lens Blur vignette
       if (state.lensBlur.vignette > 0) {
          const maxDist = Math.sqrt(cx*cx + cy*cy) || 1200;
          const ptDist = Math.sqrt((px - cx)**2 + (py - cy)**2);
          const vigPct = ptDist / maxDist;
          const vigBlend = Math.min(1, vigPct * (state.lensBlur.vignette / 100));
          r *= (1 - vigBlend * 0.42);
          g *= (1 - vigBlend * 0.42);
          b *= (1 - vigBlend * 0.42);
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

    // 7. General & Film Grain
    let finalGrain = grainAmount;
    if (gfGrain > 0) {
       finalGrain += (gfGrain * 0.35);
    }
    if (finalGrain > 0) {
        const noise = (Math.random() - 0.5) * finalGrain;
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

  // Composite Graphic Overlays (Logos, Icons, Text Watermarks)
  if (state.overlays && state.overlays.length > 0) {
    await renderOverlays(ctx, state.overlays, canvas.width, canvas.height);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

const overlayImageCache = new Map<string, HTMLImageElement>();

const getLoadedOverlayImage = (src: string): Promise<HTMLImageElement> => {
  if (overlayImageCache.has(src)) {
    const cached = overlayImageCache.get(src)!;
    if (cached.complete) return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      overlayImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

const renderOverlays = async (ctx: CanvasRenderingContext2D, overlays: OverlayItem[], width: number, height: number) => {
  if (!overlays || overlays.length === 0) return;

  for (const item of overlays) {
    if (!item.visible || item.opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, item.opacity / 100));
    ctx.globalCompositeOperation = (item.blendMode || 'source-over') as GlobalCompositeOperation;

    const posX = item.x * width;
    const posY = item.y * height;
    const baseDim = Math.min(width, height);

    ctx.translate(posX, posY);
    if (item.rotation) {
      ctx.rotate((item.rotation * Math.PI) / 180);
    }

    if (item.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    if (item.type === 'image' && item.src) {
      try {
        const img = await getLoadedOverlayImage(item.src);
        const targetWidth = baseDim * (item.scale || 0.25);
        const aspect = (img.naturalHeight || img.height || 1) / (img.naturalWidth || img.width || 1);
        const targetHeight = targetWidth * aspect;
        ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
      } catch (err) {
        console.warn('Failed to render overlay image:', err);
      }
    } else if (item.type === 'text' && item.text) {
      const fontSize = Math.max(12, Math.round(baseDim * (item.scale || 0.06)));
      ctx.font = `bold ${fontSize}px ${item.fontFamily || 'Inter, sans-serif'}`;
      ctx.fillStyle = item.color || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.text, 0, 0);
    } else if (item.type === 'icon') {
      const size = Math.max(16, Math.round(baseDim * (item.scale || 0.12)));
      ctx.fillStyle = item.color || '#ffffff';
      ctx.strokeStyle = item.color || '#ffffff';
      ctx.lineWidth = Math.max(2, size * 0.08);

      const r = size / 2;
      if (item.iconName === 'copyright') {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = `bold ${Math.round(size * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', 0, 1);
      } else if (item.iconName === 'camera') {
        ctx.beginPath();
        ctx.strokeRect(-r, -r * 0.65, size, size * 1.3);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      } else if (item.iconName === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const sx = Math.cos(outerAngle) * r;
          const sy = Math.sin(outerAngle) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
};

export const generateResultUrl = async (source: HTMLImageElement, state: ImageState, format: 'jpeg' | 'png' = 'jpeg', quality: number = 0.95): Promise<string> => {
    const imageData = await processImage(source, state, 'full');
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', format === 'jpeg' ? quality : undefined);
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
