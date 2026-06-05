
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

export interface CurvePoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface SelectivePoint {
  id: string;
  x: number; // 0 to 100
  y: number; // 0 to 100
  radius: number; // 5 to 100
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  structure: number; // -100 to 100
}

export interface LensBlurState {
  enabled: boolean;
  x: number; // 0 to 100
  y: number; // 0 to 100
  blurRadius: number; // 0 to 100
  transitionSize: number; // 0 to 100
  innerRadius: number; // 0 to 100
  vignette: number; // 0 to 100
  shape: 'circular' | 'linear';
  angle: number; // 0 to 360
}

export interface HealingStroke {
  id: string;
  points: { x: number; y: number }[]; // 0 to 100 percent
  size: number;
}

export interface HDRScapeState {
  strength: number; // 0 to 100
  brightness: number; // -100 to 100
  saturation: number; // -100 to 100
  style: 'Nature' | 'People' | 'Fine' | 'Strong';
}

export interface GrainyFilmState {
  strength: number; // 0 to 100
  grain: number; // 0 to 100
  style: 'off' | 'X01' | 'X02' | 'L01' | 'L02' | 'F01' | 'F02' | 'K01' | 'K02';
}

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

  // SNAPE-STYLE TOOLS
  curves: {
    rgb: CurvePoint[];
    r: CurvePoint[];
    g: CurvePoint[];
    b: CurvePoint[];
  };
  selectivePoints: SelectivePoint[];
  lensBlur: LensBlurState;
  healingStrokes: HealingStroke[];
  hdrScape: HDRScapeState;
  grainyFilm: GrainyFilmState;
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
  masks: [],

  // SNAP-STYLE DEFAULTS
  curves: {
    rgb: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    r: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    g: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    b: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
  },
  selectivePoints: [],
  lensBlur: {
    enabled: false,
    x: 50,
    y: 50,
    blurRadius: 0, // start at 0 (meaning disabled until adjusted, or simple slider control)
    transitionSize: 40,
    innerRadius: 20,
    vignette: 20,
    shape: 'circular',
    angle: 0
  },
  healingStrokes: [],
  hdrScape: {
    strength: 0,
    brightness: 0,
    saturation: 0,
    style: 'Nature'
  },
  grainyFilm: {
    strength: 0,
    grain: 0,
    style: 'off'
  }
};

export type ToolCategory = 'TUNE' | 'DETAILS' | 'TRANSFORM' | 'LOOKS' | 'COLOR' | null;

export interface LookPreset {
  id: string;
  name: string;
  description: string;
  gradient: string;
  adjustments: Partial<ImageState>;
}

export const LOOKS_PRESETS: LookPreset[] = [
  {
    id: 'portrait',
    name: 'Portrait',
    description: 'Brighten face details, soften surrounding skin tones with a warm golden highlight.',
    gradient: 'from-pink-300 via-rose-400 to-amber-200',
    adjustments: {
      brightness: 12,
      contrast: -5,
      saturation: 8,
      highlights: 10,
      warmth: 8,
      structure: 5,
      sharpening: 10,
      vignette: 10,
      rawProfile: 'Portrait'
    }
  },
  {
    id: 'smooth',
    name: 'Smooth',
    description: 'Reduces surface tension and microcontrast to create a pristine, flattering glow.',
    gradient: 'from-teal-200 via-emerald-300 to-sky-300',
    adjustments: {
      brightness: 15,
      contrast: -15,
      structure: -20,
      sharpening: -10,
      highlights: 10,
      shadows: 15
    }
  },
  {
    id: 'pop',
    name: 'Pop',
    description: 'Vibrant chromatic saturation and rich ambiance built for landscape and travel.',
    gradient: 'from-orange-400 via-rose-500 to-indigo-500',
    adjustments: {
      brightness: 5,
      contrast: 15,
      saturation: 20,
      structure: 15,
      ambiance: 12,
      dehaze: 10,
      rawProfile: 'Vivid'
    }
  },
  {
    id: 'accentuate',
    name: 'Accentuate',
    description: 'High-contrast edge refinement and structure that emphasizes textures and outlines.',
    gradient: 'from-yellow-400 via-amber-500 to-red-650',
    adjustments: {
      contrast: 10,
      structure: 35,
      sharpening: 25,
      dehaze: 15,
      saturation: 15,
      ambiance: 10
    }
  },
  {
    id: 'faded_glow',
    name: 'Faded Glow',
    description: 'Lovely nostalgic vintage profile with lifted, washed-out matte shadows and warm film grain.',
    gradient: 'from-amber-200 via-orange-300 to-purple-400',
    adjustments: {
      brightness: 8,
      contrast: -12,
      saturation: -10,
      shadows: 30,
      highlights: -15,
      vignette: 15,
      warmth: 15,
      grainyFilm: { strength: 40, grain: 35, style: 'X01' }
    }
  },
  {
    id: 'morning',
    name: 'Morning',
    description: 'Bask the image in dynamic, fresh, golden morning exposure and muted shadows.',
    gradient: 'from-yellow-100 via-amber-200 to-teal-100',
    adjustments: {
      brightness: 15,
      warmth: 15,
      contrast: -8,
      highlights: 15,
      shadows: 10,
      structure: -5
    }
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Clean, radiant high-exposure wash that illuminates scenery beautifully.',
    gradient: 'from-white via-neutral-100 to-emerald-105',
    adjustments: {
      brightness: 30,
      contrast: -10,
      highlights: 10,
      saturation: -5,
      shadows: 15
    }
  },
  {
    id: 'fine_art',
    name: 'Fine Art',
    description: 'Rich monochrome with dynamic light distributions, tailored for high artistic contrast.',
    gradient: 'from-neutral-800 to-neutral-400',
    adjustments: {
      saturation: -100,
      contrast: 25,
      structure: 30,
      sharpening: 20,
      vignette: 15,
      rawProfile: 'Monochrome'
    }
  },
  {
    id: 'push',
    name: 'Push',
    description: 'Gritty street look with compressed highlights, dark vignette, and crisp sharpening.',
    gradient: 'from-red-650 to-neutral-850',
    adjustments: {
      brightness: -5,
      contrast: 22,
      structure: 30,
      sharpening: 25,
      vignette: 20,
      shadows: -10
    }
  },
  {
    id: 'structure',
    name: 'Structure',
    description: 'Intense micro-contrast that maximizes detail definition and mechanical surface clarity.',
    gradient: 'from-gray-300 to-gray-700',
    adjustments: {
      structure: 52,
      sharpening: 35,
      contrast: 10,
      brightness: -2,
      shadows: 8
    }
  },
  {
    id: 'silhouette',
    name: 'Silhouette',
    description: 'Deeply crushed black shadows. Best for low-key portraits and dramatic backlighting.',
    gradient: 'from-neutral-950 via-slate-900 to-amber-700',
    adjustments: {
      brightness: -45,
      contrast: 50,
      shadows: -60,
      highlights: 25,
      saturation: -15,
      vignette: 30
    }
  },
  {
    id: 'moody_noir',
    name: 'Moody Noir',
    description: 'Cinematic noir style featuring heavily graded grain structures and high-key keylights.',
    gradient: 'from-neutral-900 to-neutral-550',
    adjustments: {
      saturation: -100,
      contrast: 40,
      brightness: -8,
      shadows: -15,
      highlights: -10,
      vignette: 40,
      grainyFilm: { strength: 60, grain: 45, style: 'L02' }
    }
  },
  {
    id: 'lkp1',
    name: 'Look Portra (LKP1)',
    description: 'Classic Kodak Portra 160. Radiant, organic warmth, optimized pastel skin tones, and soft vintage appeal.',
    gradient: 'from-amber-200 via-orange-200 to-rose-200',
    adjustments: {
      brightness: 8,
      contrast: -8,
      saturation: 10,
      warmth: 12,
      tint: 4,
      highlights: -5,
      shadows: 14,
      structure: 2,
      grainyFilm: { strength: 30, grain: 20, style: 'X01' },
      rawProfile: 'Portrait'
    }
  },
  {
    id: 'lkp2',
    name: 'Moody Bronze (LKP2)',
    description: 'Rich Kodak Portra 400. Enhanced bronze skin midtones, deep chocolate shadows, and a subtle warm glow.',
    gradient: 'from-orange-300 via-stone-400 to-amber-300',
    adjustments: {
      brightness: -2,
      contrast: 12,
      saturation: -5,
      warmth: 18,
      tint: -2,
      vignette: 15,
      shadows: -8,
      highlights: -12,
      grainyFilm: { strength: 45, grain: 28, style: 'K02' },
      rawProfile: 'Standard'
    }
  },
  {
    id: 'lkp3',
    name: 'Aesthetic Gold (LKP3)',
    description: 'Kodak Gold 200 simulation. Nostalgic high-exposure warmth, creamy cream highlights, and vibrant yellow pops.',
    gradient: 'from-yellow-250 via-amber-300 to-amber-100',
    adjustments: {
      brightness: 18,
      contrast: -4,
      saturation: 12,
      warmth: 22,
      highlights: 12,
      shadows: 8,
      vignette: 8,
      grainyFilm: { strength: 50, grain: 32, style: 'X03' }
    }
  },
  {
    id: 'lfp1',
    name: 'Fuji Superia (LFP1)',
    description: 'Classic Fujifilm look. Beautiful pastel forest greens, deep cool teals, and washed film shadows.',
    gradient: 'from-teal-300 via-emerald-200 to-sky-200',
    adjustments: {
      brightness: 4,
      contrast: -6,
      saturation: -2,
      warmth: -10,
      tint: 15,
      highlights: -10,
      shadows: 18,
      grainyFilm: { strength: 35, grain: 25, style: 'F01' },
      rawProfile: 'Landscape'
    }
  },
  {
    id: 'lfp2',
    name: 'Fuji Fortia (LFP2)',
    description: 'Vivid Chrome look. Intense jewel tones, saturated marine teals, and vibrant magenta/red pops.',
    gradient: 'from-sky-400 via-cyan-500 to-pink-500',
    adjustments: {
      brightness: 5,
      contrast: 10,
      saturation: 25,
      warmth: -12,
      tint: 8,
      structure: 12,
      ambiance: 15,
      rawProfile: 'Vivid'
    }
  },
  {
    id: 'lfs1',
    name: 'Fuji Street (LFS1)',
    description: 'Gritty street chrome simulation. Heavy structural contrast, desaturated tones, and cool-toned shadows.',
    gradient: 'from-neutral-700 via-cyan-800 to-slate-900',
    adjustments: {
      brightness: -5,
      contrast: 24,
      saturation: -18,
      structure: 35,
      sharpening: 25,
      warmth: -14,
      vignette: 25,
      shadows: -15,
      grainyFilm: { strength: 55, grain: 40, style: 'L01' }
    }
  },
  {
    id: 'lfs2',
    name: 'Silver Contrast (LFS2)',
    description: 'Classic silver halide monochrome with crispy, dense shadows and razor-sharp structural grains.',
    gradient: 'from-slate-350 to-neutral-900',
    adjustments: {
      saturation: -100,
      contrast: 35,
      structure: 45,
      sharpening: 35,
      vignette: 20,
      shadows: -8,
      highlights: 5,
      grainyFilm: { strength: 65, grain: 50, style: 'B01' },
      rawProfile: 'Monochrome'
    }
  }
];
