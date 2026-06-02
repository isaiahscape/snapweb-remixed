
export type ColorChannel = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta';

export interface ColorAdjustment {
  hue: number; // -100 to 100
  saturation: number; // -100 to 100
  luminance: number; // -100 to 100
}

export type ColorGradeState = Record<ColorChannel, ColorAdjustment>;

export const DEFAULT_COLOR_GRADE: ColorGradeState = {
  red: { hue: 0, saturation: 0, luminance: 0 },
  orange: { hue: 0, saturation: 0, luminance: 0 },
  yellow: { hue: 0, saturation: 0, luminance: 0 },
  green: { hue: 0, saturation: 0, luminance: 0 },
  aqua: { hue: 0, saturation: 0, luminance: 0 },
  blue: { hue: 0, saturation: 0, luminance: 0 },
  purple: { hue: 0, saturation: 0, luminance: 0 },
  magenta: { hue: 0, saturation: 0, luminance: 0 },
};

export interface MaskSettings {
    brightness: number;
    contrast: number;
    saturation: number;
    exposure: number;
    warmth: number;
    tint: number;
    structure: number;
    colorGrade: ColorGradeState;
}

export interface MaskLayer {
    id: string;
    name: string;
    isVisible: boolean;
    settings: MaskSettings;
    // We store the mask as a hidden canvas element to handle soft brush strokes efficiently
    maskCanvas: HTMLCanvasElement; 
}

export const DEFAULT_MASK_SETTINGS: MaskSettings = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    warmth: 0,
    tint: 0,
    structure: 0,
    colorGrade: DEFAULT_COLOR_GRADE
};

export interface ImageState {
  // RAW Developer Adjustments (Only active for RAW images)
  rawTemperature: number; // -100 to 100
  rawTint: number; // -100 to 100
  rawExposureEV: number; // -3.0 to 3.0
  rawHighlights: number; // -100 to 100
  rawShadows: number; // -100 to 100
  rawProfile: 'Standard' | 'Vivid' | 'Landscape' | 'Portrait' | 'Monochrome' | 'Sunny' | 'Cloudy' | 'Shade' | 'Tungsten' | 'Fluorescent' | 'Flash';

  // Light & Color
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  ambiance: number; // -100 to 100 (Smart light balance)
  warmth: number; // -100 to 100 (Temperature)
  tint: number; // -100 to 100 (Green/Magenta)
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  
  // Details & Effects
  structure: number; // 0 to 100 (Local contrast)
  sharpening: number; // 0 to 100 (Edge enhancement)
  dehaze: number; // 0 to 100 (Atmospheric removal)
  grain: number; // 0 to 100
  vignette: number; // 0 to 100
  
  // Color Mixer (HSL)
  colorGrade: ColorGradeState;

  // Geometry
  rotation: number; // 0, 90, 180, 270 (Structural rotation)
  straighten: number; // -45 to 45 (Fine tune rotation)
  flipH: boolean;
  flipV: boolean;
  crop: { x: number; y: number; width: number; height: number } | null;
  constrain: boolean; // Auto-zoom to fill bounds when rotating

  // Local Selective Edits
  masks: MaskLayer[];
}

export const DEFAULT_IMAGE_STATE: ImageState = {
  rawTemperature: 0,
  rawTint: 0,
  rawExposureEV: 0,
  rawHighlights: 0,
  rawShadows: 0,
  rawProfile: 'Standard',

  brightness: 0,
  contrast: 0,
  saturation: 0,
  ambiance: 0,
  warmth: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  structure: 0,
  sharpening: 0,
  dehaze: 0,
  grain: 0,
  vignette: 0,
  colorGrade: DEFAULT_COLOR_GRADE,
  rotation: 0,
  straighten: 0,
  flipH: false,
  flipV: false,
  crop: null,
  constrain: false,
  masks: []
};

export type ToolCategory = 'TUNE' | 'DETAILS' | 'TRANSFORM' | 'LOOKS' | 'COLOR' | null;
