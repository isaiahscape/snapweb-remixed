
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_IMAGE_STATE, ImageState, ColorChannel, ColorAdjustment, MaskLayer, DEFAULT_MASK_SETTINGS, DEFAULT_COLOR_GRADE } from './types';
import { processImage, generateResultUrl, loadRawImage, getClosestColorChannel } from './services/imageProcessor';
import Histogram from './components/Histogram';
import { Slider, ToolButton, IconButton } from './components/Controls';
import Cropper from './components/Cropper';
import ColorMixer from './components/ColorMixer';
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Loader2, FolderOpen, Cloud, LogOut, RefreshCw, Globe, Settings2, ArrowLeft, AlertCircle, Upload as LucideUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Modern Phosphor-style Icons (SVG)
const Icons = {
  Upload: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Download: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Undo: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
  Compare: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  ChevronDown: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" /></svg>,
  Rotate: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Flip: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  Ruler: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M10 3H6a2 2 0 00-2-2v14a2 2 0 002 2h12a2 2 0 002-2v-4m-6-2a2 2 0 110-4 2 2 0 010 4zm-6 6h12m-4 4h4" /></svg>,
  Crop: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M5 19h14a2 2 0 002-2v-5m-9-9v5m-4 0h14M5 8h4" /></svg>,
  Brush: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Eye: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="square" strokeLinejoin="miter" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  EyeOff: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>,
  Plus: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M12 4v16m8-8H4" /></svg>,
  Trash: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
};

// Sidebar Section Component
const SidebarSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-neutral-800">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex justify-between items-center py-4 px-5 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors"
            >
                {title}
                <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} w-4 h-4 text-neutral-500`}>
                    {Icons.ChevronDown}
                </div>
            </button>
            {isOpen && (
                <div className="px-5 pb-6 animate-slideDown">
                    {children}
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [previewData, setPreviewData] = useState<ImageData | null>(null);
  const [imageState, setImageState] = useState<ImageState>(DEFAULT_IMAGE_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isRaw, setIsRaw] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Color Mixer State
  const [activeColorChannel, setActiveColorChannel] = useState<ColorChannel>('red');
  const [isColorPickerActive, setIsColorPickerActive] = useState(false);
  
  // Modes
  const [isCropMode, setIsCropMode] = useState(false);

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{x: number, y: number} | null>(null);

  // Geometry Tool States
  const [isStraightenToolActive, setIsStraightenToolActive] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{x: number, y: number} | null>(null);

  // Masking / Selective State
  const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(50);
  const [brushHardness, setBrushHardness] = useState(0); // 0 = soft, 100 = hard
  const [isErasing, setIsErasing] = useState(false);
  const [showMaskOverlay, setShowMaskOverlay] = useState(true);
  const [isPainting, setIsPainting] = useState(false);
  const lastPaintPos = useRef<{x: number, y: number} | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // To show the red mask overlay
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google OAuth / Drive States
  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('snapweb_gdrive_client_id') || '';
  });
  const [googleAccessToken, setGoogleAccessToken] = useState(() => {
    return sessionStorage.getItem('snapweb_gdrive_token') || '';
  });
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [isConfiguringCredentials, setIsConfiguringCredentials] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Check popup hash redirect and communicate token
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token && window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_TOKEN', token }, window.location.origin);
        window.close();
      }
    }
  }, []);

  // Listen for login message/token from popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_OAUTH_TOKEN') {
        const token = event.data.token;
        setGoogleAccessToken(token);
        sessionStorage.setItem('snapweb_gdrive_token', token);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleGoogleLogout = useCallback(() => {
    setGoogleAccessToken('');
    sessionStorage.removeItem('snapweb_gdrive_token');
    setGoogleUser(null);
    setDriveFiles([]);
  }, []);

  const fetchGoogleUserProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleUser(data);
      } else {
        if (res.status === 401) {
          handleGoogleLogout();
        }
      }
    } catch (err) {
      console.error("Failed to fetch Google profile:", err);
    }
  }, [handleGoogleLogout]);

  const fetchDriveFiles = useCallback(async (token: string) => {
    setIsFetchingDrive(true);
    try {
      const q = encodeURIComponent("mimeType contains 'image/' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,size,createdTime)&pageSize=32&orderBy=modifiedTime+desc`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      } else {
        if (res.status === 401) {
          handleGoogleLogout();
        }
        console.error("Drive API load error:", await res.text());
      }
    } catch (err) {
      console.error("Failed to fetch Drive files:", err);
    } finally {
      setIsFetchingDrive(false);
    }
  }, [handleGoogleLogout]);

  useEffect(() => {
    if (googleAccessToken) {
      fetchGoogleUserProfile(googleAccessToken);
      fetchDriveFiles(googleAccessToken);
    }
  }, [googleAccessToken, fetchGoogleUserProfile, fetchDriveFiles]);

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      setIsConfiguringCredentials(true);
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent("https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile")}`;
    window.open(authUrl, 'google_oauth_popup', 'width=550,height=650,left=150,top=50');
  };

  const handleSaveClientId = (id: string) => {
    const trimmed = id.trim();
    setGoogleClientId(trimmed);
    localStorage.setItem('snapweb_gdrive_client_id', trimmed);
    setIsConfiguringCredentials(false);
    
    // Auto login if client id isn't empty and they click save
    if (trimmed) {
      setTimeout(() => {
        const redirectUri = encodeURIComponent(window.location.origin);
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${trimmed}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent("https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile")}`;
        window.open(authUrl, 'google_oauth_popup', 'width=550,height=650,left=150,top=50');
      }, 300);
    }
  };

  const loadDriveFile = async (fileId: string, filename: string) => {
    if (!googleAccessToken) return;
    setIsLoadingFile(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });
      if (!res.ok) throw new Error("Could not download file content from Drive");
      const blob = await res.blob();
      
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      const lowerName = filename.toLowerCase();
      const isRawFile = lowerName.endsWith('.dng') || lowerName.endsWith('.cr2') || lowerName.endsWith('.nef') || lowerName.endsWith('.arw');
      
      let img: HTMLImageElement;
      if (isRawFile) {
        setIsRaw(true);
        img = await loadRawImage(file);
      } else {
        setIsRaw(false);
        img = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = ev.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      }

      setSourceImage(img);
      setImageState(DEFAULT_IMAGE_STATE);
      setActiveMaskId(null);
    } catch (err: any) {
      console.error(err);
      alert("Error loading photo from Google Drive: " + err.message);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const loadSampleImage = () => {
    setIsLoadingFile(true);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = 'https://picsum.photos/1920/1280';
    img.onload = () => {
      setSourceImage(img);
      setIsRaw(false);
      setImageState(DEFAULT_IMAGE_STATE);
      setActiveMaskId(null);
      setIsLoadingFile(false);
    };
    img.onerror = () => {
      setIsLoadingFile(false);
      alert("Failed to load sample image. Please verify your connection.");
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isRawFile = fileName.endsWith('.dng') || fileName.endsWith('.cr2') || fileName.endsWith('.nef') || fileName.endsWith('.arw');

    setIsLoadingFile(true);

    try {
      let img: HTMLImageElement;
      if (isRawFile) {
        setIsRaw(true);
        img = await loadRawImage(file);
      } else {
        setIsRaw(false);
        img = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = ev.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      }

      setSourceImage(img);
      setImageState(DEFAULT_IMAGE_STATE);
      setActiveMaskId(null);
    } catch (err) {
      console.error("Failed to load dropped image", err);
      alert("Could not load file. If this is a RAW file, the format may not be supported yet.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Reset zoom when image changes
  useEffect(() => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  }, [sourceImage]);

  // Helper to render the red overlay directly from mask data
  // We use this manually during painting for performance, and in useEffect for state updates
  const updateOverlayCanvas = useCallback(() => {
    if (!overlayCanvasRef.current || !canvasRef.current || !activeMaskId) {
        // Clear if disabled
        if (overlayCanvasRef.current) {
            const ctx = overlayCanvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
        return;
    }
    
    // Early exit if overlay is hidden via toggle
    if (!showMaskOverlay) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        return;
    }

    const mask = imageState.masks.find(m => m.id === activeMaskId);
    if (!mask) return;

    const oCvs = overlayCanvasRef.current;
    const mainCvs = canvasRef.current;
    
    if (oCvs.width !== mainCvs.width || oCvs.height !== mainCvs.height) {
        oCvs.width = mainCvs.width;
        oCvs.height = mainCvs.height;
    }

    const ctx = oCvs.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, oCvs.width, oCvs.height);
        
        // Draw the mask
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(mask.maskCanvas, 0, 0, oCvs.width, oCvs.height);
        
        // Tint it red
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fillRect(0, 0, oCvs.width, oCvs.height);
    }
  }, [activeMaskId, imageState.masks, showMaskOverlay, previewData]);

  // Update Mask Overlay whenever image or mask state changes
  useEffect(() => {
    updateOverlayCanvas();
  }, [updateOverlayCanvas]);

  // Process pipeline
  const updatePreview = useCallback(async (forceOriginal = false) => {
    if (!sourceImage || !canvasRef.current) return;

    const stateToUse = forceOriginal ? DEFAULT_IMAGE_STATE : imageState;

    try {
        const imageData = await processImage(sourceImage, stateToUse, 'preview');
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
          canvas.width = imageData.width;
          canvas.height = imageData.height;
        }

        ctx.putImageData(imageData, 0, 0);
        setPreviewData(imageData);
    } catch (e) {
        console.error("Processing error:", e);
    }
  }, [sourceImage, imageState]);

  // Trigger update on state change
  useEffect(() => {
    if (!isProcessing && sourceImage && !isCropMode) {
        setIsProcessing(true);
        requestAnimationFrame(() => {
            updatePreview(isComparing).then(() => setIsProcessing(false));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageState, sourceImage, isComparing, isCropMode]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isRawFile = fileName.endsWith('.dng') || fileName.endsWith('.cr2') || fileName.endsWith('.nef') || fileName.endsWith('.arw');

    setIsLoadingFile(true);

    try {
      let img: HTMLImageElement;
      
      if (isRawFile) {
        setIsRaw(true);
        img = await loadRawImage(file);
      } else {
        setIsRaw(false);
        img = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = ev.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      }

      setSourceImage(img);
      setImageState(DEFAULT_IMAGE_STATE);
      setActiveMaskId(null);
    } catch (err) {
      console.error("Failed to load image", err);
      alert("Could not load file. If this is a RAW file, the format may not be supported yet.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleDownload = async () => {
    if (!sourceImage) return;
    setIsExporting(true);
    
    // setTimeout allows the browser main thread to paint the export dialog/loader
    // before executing heavy canvas/image manipulation tasks.
    setTimeout(async () => {
      try {
        const url = await generateResultUrl(sourceImage, imageState);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snapweb-edit-${Date.now()}.jpg`;
        a.click();
      } catch (err) {
        console.error("Export failed", err);
      } finally {
        setIsExporting(false);
      }
    }, 850);
  };

  const handleReset = () => {
      if(confirm("Reset all edits to original?")) {
          setImageState(DEFAULT_IMAGE_STATE);
          setActiveMaskId(null);
      }
  }

  const updateState = (key: keyof ImageState, value: any) => {
    setImageState(prev => ({ ...prev, [key]: value }));
  };

  const updateColorGrade = (channel: ColorChannel, adjustment: ColorAdjustment) => {
      setImageState(prev => ({
          ...prev,
          colorGrade: {
              ...prev.colorGrade,
              [channel]: adjustment
          }
      }));
  };

  const updateMaskColorGrade = (channel: ColorChannel, adjustment: ColorAdjustment) => {
    if (!activeMaskId) return;
    setImageState(prev => ({
        ...prev,
        masks: prev.masks.map(m => m.id === activeMaskId ? {
            ...m,
            settings: {
                ...m.settings,
                colorGrade: {
                    ...m.settings.colorGrade,
                    [channel]: adjustment
                }
            }
        } : m)
    }));
  };

  // --- Mask Management ---
  const addMask = () => {
      if (!sourceImage) return;
      const newId = Date.now().toString();
      const canvas = document.createElement('canvas');
      // Initialize mask canvas to a reasonable working resolution
      // We'll scale it during processing
      canvas.width = 1024; 
      canvas.height = 1024 * (sourceImage.naturalHeight / sourceImage.naturalWidth);
      
      const newMask: MaskLayer = {
          id: newId,
          name: `Mask ${imageState.masks.length + 1}`,
          isVisible: true,
          settings: { 
            ...DEFAULT_MASK_SETTINGS,
            // Deep copy color grade to ensure independent instances
            colorGrade: JSON.parse(JSON.stringify(DEFAULT_COLOR_GRADE))
          },
          maskCanvas: canvas
      };
      
      setImageState(prev => ({
          ...prev,
          masks: [...prev.masks, newMask]
      }));
      setActiveMaskId(newId);
      setIsStraightenToolActive(false);
      setIsColorPickerActive(false);
  };

  const removeMask = (id: string) => {
      setImageState(prev => ({
          ...prev,
          masks: prev.masks.filter(m => m.id !== id)
      }));
      if (activeMaskId === id) setActiveMaskId(null);
  };

  const updateMaskSettings = (id: string, key: keyof typeof DEFAULT_MASK_SETTINGS, value: number) => {
      setImageState(prev => ({
          ...prev,
          masks: prev.masks.map(m => m.id === id ? { ...m, settings: { ...m.settings, [key]: value }} : m)
      }));
  };

  // --- Painting Logic ---
  const paintStroke = (x: number, y: number) => {
      if (!activeMaskId) return;
      const mask = imageState.masks.find(m => m.id === activeMaskId);
      if (!mask) return;

      const ctx = mask.maskCanvas.getContext('2d');
      if (!ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      
      // Improved Softness Logic: Proportional to brush size
      // If Hardness = 0 (Soft), Blur should be large relative to brush.
      // If Hardness = 100 (Hard), Blur = 0.
      const blurAmount = (brushSize * 0.5) * ((100 - brushHardness) / 100);
      
      ctx.shadowBlur = blurAmount;
      ctx.shadowColor = isErasing ? 'rgba(0,0,0,1)' : 'white'; 
      
      ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
      ctx.strokeStyle = isErasing ? 'rgba(0,0,0,1)' : 'white';
      ctx.fillStyle = isErasing ? 'rgba(0,0,0,1)' : 'white';

      ctx.beginPath();
      if (lastPaintPos.current) {
          ctx.moveTo(lastPaintPos.current.x, lastPaintPos.current.y);
          ctx.lineTo(x, y);
          ctx.stroke();
      } else {
          ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
      }

      // PERF FIX: Do NOT trigger react state update here.
      // Instead, manually redraw the overlay for 60fps feedback.
      updateOverlayCanvas();
  };

  // --- Zoom Interaction ---
  const handleWheel = (e: React.WheelEvent) => {
      if (e.altKey || e.ctrlKey) {
          e.preventDefault();
          
          if (!containerRef.current) return;

          const rect = containerRef.current.getBoundingClientRect();
          // Calculate mouse position relative to center of the container
          const mouseX = e.clientX - (rect.left + rect.width / 2);
          const mouseY = e.clientY - (rect.top + rect.height / 2);

          const delta = -e.deltaY * 0.001;
          const targetZoom = zoom + delta * 5;
          const newZoom = Math.min(Math.max(1, targetZoom), 5); // Scale 1x to 5x
          
          if (newZoom !== zoom) {
              if (newZoom === 1) {
                   setPan({ x: 0, y: 0 });
                   setZoom(1);
              } else {
                  const scaleFactor = newZoom / zoom;
                  const newPanX = mouseX * (1 - scaleFactor) + pan.x * scaleFactor;
                  const newPanY = mouseY * (1 - scaleFactor) + pan.y * scaleFactor;
                  setPan({ x: newPanX, y: newPanY });
                  setZoom(newZoom);
              }
          }
      }
  };

  // --- Canvas Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !canvasRef.current) return;

    // 0. Mask Painting Logic (Top Priority)
    if (activeMaskId) {
        // Prevent pan if we are painting, unless we hold space?
        // For now, left click paints.
        setIsPainting(true);
        
        const mask = imageState.masks.find(m => m.id === activeMaskId);
        if (mask) {
             // COORDINATE FIX: Use canvas.getBoundingClientRect()
             // This gives us the exact visual bounds of the canvas, accounting for
             // all CSS transforms (zoom, pan, center) automatically.
             const rect = canvasRef.current.getBoundingClientRect();
             
             const clickX = e.clientX - rect.left;
             const clickY = e.clientY - rect.top;
             
             // Calculate ratio between visual size and internal resolution
             const scaleX = canvasRef.current.width / rect.width;
             const scaleY = canvasRef.current.height / rect.height;
             
             // Coordinate in the preview canvas (internal resolution)
             const canvasX = clickX * scaleX;
             const canvasY = clickY * scaleY;

             // Scale to maskCanvas actual resolution
             const maskScaleX = mask.maskCanvas.width / canvasRef.current.width;
             const maskScaleY = mask.maskCanvas.height / canvasRef.current.height;

             const finalX = canvasX * maskScaleX;
             const finalY = canvasY * maskScaleY;

             lastPaintPos.current = { x: finalX, y: finalY };
             paintStroke(finalX, finalY);
        }
        return;
    }

    // 1. Color Picker Logic
    if (isColorPickerActive) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (
            e.clientX >= rect.left && 
            e.clientX <= rect.right && 
            e.clientY >= rect.top && 
            e.clientY <= rect.bottom
        ) {
            const scaleX = canvasRef.current.width / rect.width;
            const scaleY = canvasRef.current.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                const channel = getClosestColorChannel(pixel[0], pixel[1], pixel[2]);
                setActiveColorChannel(channel);
                setIsColorPickerActive(false); 
            }
        }
        return;
    }

    // 2. Straighten Logic
    if (isStraightenToolActive) {
        const rect = containerRef.current.getBoundingClientRect();
        setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
    }

    // 3. Pan Logic
    if (zoom > 1) {
        setIsPanning(true);
        panStart.current = { 
            x: e.clientX - pan.x, 
            y: e.clientY - pan.y 
        };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Painting
    if (isPainting && activeMaskId && containerRef.current && canvasRef.current) {
        const mask = imageState.masks.find(m => m.id === activeMaskId);
        if (mask) {
             // COORDINATE FIX: Match mouseDown logic
             const rect = canvasRef.current.getBoundingClientRect();
             
             const clickX = e.clientX - rect.left;
             const clickY = e.clientY - rect.top;
             
             const scaleX = canvasRef.current.width / rect.width;
             const scaleY = canvasRef.current.height / rect.height;
             
             const canvasX = clickX * scaleX;
             const canvasY = clickY * scaleY;

             const maskScaleX = mask.maskCanvas.width / canvasRef.current.width;
             const maskScaleY = mask.maskCanvas.height / canvasRef.current.height;

             const finalX = canvasX * maskScaleX;
             const finalY = canvasY * maskScaleY;

             paintStroke(finalX, finalY);
             lastPaintPos.current = { x: finalX, y: finalY };
        }
        return;
    }

    // Straighten
    if (isStraightenToolActive && dragStart && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
    }

    // Pan
    if (isPanning && panStart.current) {
        e.preventDefault();
        setPan({
            x: e.clientX - panStart.current.x,
            y: e.clientY - panStart.current.y
        });
    }
  };

  const handleMouseUp = () => {
    if (isPainting) {
        setIsPainting(false);
        lastPaintPos.current = null;
        
        // TRIGGER STATE CHANGE ONLY ON MOUSE UP
        // We create a shallow copy of the masks array to notify React that 
        // the underlying canvas data (which is mutable) needs to be processed.
        setImageState(prev => ({
            ...prev,
            masks: [...prev.masks] 
        }));
    }

    if (isPanning) {
        setIsPanning(false);
        panStart.current = null;
    }

    if (isStraightenToolActive && dragStart && dragCurrent) {
        const deltaX = dragCurrent.x - dragStart.x;
        const deltaY = dragCurrent.y - dragStart.y;
        if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 10) {
            const angleRad = Math.atan2(deltaY, deltaX);
            const angleDeg = angleRad * (180 / Math.PI);
            let newStraighten = imageState.straighten - angleDeg;
            newStraighten = Math.max(-45, Math.min(45, newStraighten));
            updateState('straighten', newStraighten);
        }
        setDragStart(null);
        setDragCurrent(null);
        setIsStraightenToolActive(false);
    }
  };

  if (isCropMode && sourceImage) {
      return (
          <Cropper 
            image={sourceImage} 
            initialCrop={imageState.crop}
            onCancel={() => setIsCropMode(false)}
            onComplete={(rect) => {
                updateState('crop', rect);
                setIsCropMode(false);
            }}
          />
      );
  }

  const activeMask = imageState.masks.find(m => m.id === activeMaskId);

  if (!sourceImage) {
    return (
      <div 
        className="flex flex-col min-h-screen w-full bg-black text-white font-sans selection:bg-white selection:text-black"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Simple elegant header */}
        <header className="h-16 bg-black border-b border-neutral-900 flex justify-between items-center px-6 shrink-0">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-neutral-100">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <div className="font-bold tracking-[0.2em] text-xs text-white">
              SNAPWEB <span className="text-neutral-500 font-normal">PRO</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1 bg-neutral-900/60 border border-neutral-800 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              On-Device Mode
            </span>
          </div>
        </header>

        {/* Content container */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 flex flex-col justify-center gap-8 relative">
          
          {/* Headline */}
          <div className="text-center max-w-2xl mx-auto mb-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Professional RAW & Photo Editing, <br/>
              <span className="bg-gradient-to-r from-neutral-200 to-neutral-400 bg-clip-text text-transparent">Directly in your Browser.</span>
            </h1>
            <p className="mt-3.5 text-xs text-neutral-400 leading-relaxed max-w-lg mx-auto">
              Inspired by Snapseed, SnapWeb provides state-of-the-art selective editing, color grading, and on-device processing. No cloud uploads, complete privacy, absolute speed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Left Column: Local Uploader */}
            <div 
              className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-300 p-8 bg-neutral-950/40 backdrop-blur-sm
                ${isDraggingOver 
                  ? 'border-neutral-200 bg-neutral-900/10 scale-[1.015]' 
                  : 'border-neutral-800 hover:border-neutral-700'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className={`p-4 rounded-full bg-neutral-900 border transition-transform duration-300 ${isDraggingOver ? 'scale-110 border-neutral-400' : 'border-neutral-800'}`}>
                  <FolderOpen className="w-8 h-8 text-neutral-300 pointer-events-none" />
                </div>
                
                <h3 className="mt-5 text-sm font-bold uppercase tracking-wider text-neutral-100">Open Local Photo</h3>
                <p className="mt-2 text-xs text-neutral-400 max-w-xs leading-relaxed">
                  Drag and drop your picture here, or browse local folders. Fully supports standard files and professional RAW formats.
                </p>
                <span className="mt-1.5 text-[9px] text-neutral-500 font-mono">
                  PNG, JPEG, WEBP, TIFF, DNG, CR2, NEF, ARW
                </span>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition shadow-md cursor-pointer flex items-center gap-2"
                >
                  <LucideUpload className="w-3.5 h-3.5" />
                  Browse Files
                </button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*,.dng,.cr2,.nef,.arw" 
                  className="hidden" 
                  onChange={handleUpload} 
                />
              </div>

              <div className="border-t border-neutral-900 pt-6 mt-4 flex items-center justify-center gap-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Need a test?</span>
                <button 
                  onClick={loadSampleImage}
                  className="text-xs text-neutral-100 hover:text-white font-bold underline bg-neutral-900/50 hover:bg-neutral-950 px-3 py-1.5 rounded-md border border-neutral-800 transition-colors cursor-pointer"
                >
                  Try Sample Photo
                </button>
              </div>
            </div>

            {/* Right Column: Google Drive */}
            <div className="flex flex-col justify-between rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all duration-300 p-8 bg-neutral-950/40 backdrop-blur-sm">
              <div className="flex flex-col h-full">
                
                <div className="flex justify-between items-start border-b border-neutral-900 pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-400 shrink-0" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-100">Google Drive</h3>
                  </div>
                  {googleAccessToken && (
                    <button 
                      onClick={handleGoogleLogout}
                      className="text-[10px] font-bold text-neutral-400 hover:text-red-400 flex items-center gap-1.5 tracking-wider bg-neutral-900 px-2.5 py-1 rounded transition-colors cursor-pointer"
                      title="Disconnect Google Account"
                    >
                      <LogOut className="w-3 h-3" />
                      SIGN OUT
                    </button>
                  )}
                </div>

                {isFetchingDrive ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
                    <span className="text-xs text-neutral-400 tracking-wider font-semibold uppercase">Listing cloud files...</span>
                  </div>
                ) : !googleAccessToken ? (
                  // Connect / Authorize Tab
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <div className="p-4 rounded-full bg-neutral-900 border border-neutral-800 mb-4">
                      <Globe className="w-7 h-7 text-neutral-300" />
                    </div>
                    <p className="text-xs text-neutral-400 max-w-sm leading-relaxed mb-5">
                      Access and develop photo files saved directly in your Google Drive cloud account. Secure, serverless, and private.
                    </p>

                    {isConfiguringCredentials ? (
                      <div className="w-full max-w-sm bg-neutral-900/60 p-4 border border-neutral-800/80 rounded-xl mb-4 text-left">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400 mb-1.5">
                          Google Client ID (OAuth 2.0 Web Client)
                        </label>
                        <input
                          type="text"
                          defaultValue={googleClientId}
                          placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveClientId((e.target as HTMLInputElement).value);
                            }
                          }}
                          onBlur={(e) => handleSaveClientId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs font-mono text-neutral-200 tracking-wider focus:outline-none focus:border-neutral-500 placeholder:text-neutral-700"
                        />
                        <p className="text-[9px] text-neutral-500 leading-normal mt-2">
                          Press <kbd className="bg-neutral-800 px-1 border border-neutral-700 rounded text-neutral-400 font-mono">Enter</kbd> to save and sign-in. To setup, enable the Google Drive API in your Google Developer console and configure authorized origins.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 w-full">
                        <button 
                          onClick={handleGoogleLogin}
                          disabled={isLoadingFile}
                          className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                        >
                          <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                            <path d="M23.745 12.27c0-.70-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.1.1.1. 1.14-.1. 2.63-1.07 3.53l3.29 2.55c1.93-1.78 3.03-4.39 3.03-7.39z"/>
                            <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.29-2.55c-.91.61-2.08.98-3.41.98-3.14 0-5.81-2.12-6.76-4.97L.533 17.58C2.56 21.4 6.94 24 12 24z"/>
                            <path d="M5.24 14.55c-.24-.72-.38-1.5-.38-2.3 0-.8.14-1.58.38-2.3L1.24 3.75C.45 5.4 0 7.22 0 9.1c0 1.88.45 3.7 1.24 5.35l4 9.1z"/>
                            <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 6.94 0 2.56 2.6 1.24 5.35l4 9.1c.95-2.85 3.62-4.97 6.76-4.97z"/>
                          </svg>
                          Connect Google Drive
                        </button>
                        
                        <button
                          onClick={() => setIsConfiguringCredentials(true)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Settings2 className="w-3 h-3" />
                          Credentials Setup
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // File display list
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    
                    <div className="flex justify-between items-center bg-neutral-900/40 px-3 py-2 rounded-lg border border-neutral-800/60 shrink-0 mb-3 ml-0.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {googleUser?.picture ? (
                          <img 
                            src={googleUser.picture} 
                            referrerPolicy="no-referrer" 
                            alt="User avatar" 
                            className="w-5 h-5 rounded-full border border-neutral-800 shrink-0" 
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 shrink-0"></div>
                        )}
                        <span className="text-[10px] font-bold text-neutral-300 tracking-wider truncate max-w-[150px] uppercase">
                          {googleUser?.name || 'Cloud Library'}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => fetchDriveFiles(googleAccessToken)}
                        className="p-1 px-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                        title="Reload Photo List"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[220px] pr-1.5 custom-scrollbar grid grid-cols-2 gap-3 pb-2 ml-0.5">
                      {driveFiles.length === 0 ? (
                        <div className="col-span-2 flex flex-col items-center justify-center text-center py-6">
                          <AlertCircle className="w-5 h-5 text-neutral-600 mb-1.5" />
                          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">No photos found</span>
                          <span className="text-[9px] text-neutral-500 mt-0.5">Make sure you have image files in your Google Drive folder.</span>
                        </div>
                      ) : (
                        driveFiles.map(file => (
                          <button
                            key={file.id}
                            onClick={() => loadDriveFile(file.id, file.name)}
                            disabled={isLoadingFile}
                            className="group flex flex-col items-center text-left bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 rounded-xl overflow-hidden p-2 transition duration-200 cursor-pointer w-full text-neutral-300 disabled:opacity-50"
                          >
                            <div className="relative w-full aspect-[4/3] bg-neutral-950 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                              {file.thumbnailLink ? (
                                <img
                                  src={file.thumbnailLink}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                  alt={file.name}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div className="absolute inset-x-0 bottom-0 bg-neutral-950/80 p-1 flex justify-center text-[8px] font-semibold text-neutral-400 font-mono uppercase tracking-widest truncate">
                                {file.mimeType?.split('/')[1]?.toUpperCase() || 'IMAGE'}
                              </div>
                            </div>
                            
                            <div className="w-full mt-2 flex flex-col leading-tight overflow-hidden px-1">
                              <span className="text-[10px] font-bold text-neutral-200 group-hover:text-white truncate uppercase tracking-tight">
                                {file.name}
                              </span>
                              <span className="text-[8px] text-neutral-500 mt-1 uppercase">
                                {new Date(file.createdTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                  </div>
                )}

              </div>
            </div>

          </div>

        </main>

        {/* Global Loading Overlay */}
        {isLoadingFile && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <Loader2 className="w-8 h-8 text-neutral-100 animate-spin mb-4" />
            <div className="text-center font-bold uppercase tracking-widest text-[11px]">
              Processing Photo File...
            </div>
            <div className="text-[9px] text-neutral-500 mt-1 uppercase tracking-wider">
              Decoding metadata & calibrating system profiles
            </div>
          </div>
        )}

        {/* Unobtrusive footer */}
        <footer className="h-10 border-t border-neutral-900 flex items-center justify-center px-6 text-[9px] text-neutral-600 font-mono shrink-0 select-none uppercase tracking-widest">
          SnapWeb Pro © 2026 • Secure Browser Image Engine
        </footer>

      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden font-sans">
      
      {/* Top Navigation */}
      <header className="h-14 bg-black border-b border-neutral-900 flex justify-between items-center px-4 shrink-0 z-30">
        <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                if (confirm("Close this image and return to homepage? Unsaved changes will be lost.")) {
                  setSourceImage(null);
                  setImageState(DEFAULT_IMAGE_STATE);
                  setActiveMaskId(null);
                }
              }}
              className="text-neutral-400 hover:text-white flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors mr-1 cursor-pointer bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-2.5 py-1.5 rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Close
            </button>
            <div className="font-bold tracking-[0.25em] text-sm text-white">
                SNAPWEB <span className="text-neutral-600 font-normal">PRO</span>
            </div>
            <div className="h-6 w-px bg-neutral-800"></div>
            <div className="flex gap-2">
                <ToolButton onClick={() => fileInputRef.current?.click()} title="Open Image">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4">{Icons.Upload}</span>
                        OPEN
                    </div>
                </ToolButton>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*,.dng,.cr2,.nef,.arw" 
                  className="hidden" 
                  onChange={handleUpload} 
                />
                
                {sourceImage && (
                    <ToolButton onClick={() => setIsCropMode(true)} title="Crop Image">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-4 h-4">{Icons.Crop}</span>
                            CROP
                        </div>
                    </ToolButton>
                )}
            </div>
        </div>

        <div className="flex items-center gap-2">
             {isRaw && (
                 <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-yellow-500 border border-neutral-700 mr-2">
                     RAW MODE
                 </div>
             )}
             {/* Show warning if masking is active */}
             {activeMaskId && (
                 <div className="flex items-center gap-2 mr-4 animate-pulse text-red-500 text-xs font-bold uppercase tracking-wider border border-red-900/50 bg-red-900/10 px-3 py-1 rounded">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Masking Mode Active
                 </div>
             )}

             {JSON.stringify(imageState) !== JSON.stringify(DEFAULT_IMAGE_STATE) && (
                 <IconButton 
                    icon={Icons.Undo} 
                    onClick={handleReset} 
                    title="Reset All"
                    className="hover:bg-neutral-900"
                 />
             )}
             <button 
                onMouseDown={() => setIsComparing(true)}
                onMouseUp={() => setIsComparing(false)}
                onMouseLeave={() => setIsComparing(false)}
                className="p-2 text-neutral-400 hover:text-white transition-colors"
                title="Hold to Compare"
             >
                 <div className="w-5 h-5">{Icons.Compare}</div>
             </button>
             <div className="h-6 w-px bg-neutral-800 mx-2"></div>
             <button onClick={handleDownload} className="bg-white text-black px-5 py-1.5 rounded text-xs font-bold tracking-wider hover:bg-neutral-200 transition flex items-center gap-2">
                EXPORT
             </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Center: Canvas */}
        <main className="flex-1 bg-[#0a0a0a] relative flex items-center justify-center p-8 select-none overflow-hidden">
             {isComparing && (
                <div className="absolute top-8 left-8 bg-white text-black px-3 py-1 rounded text-xs font-bold uppercase tracking-widest z-50 pointer-events-none shadow-xl">
                    Original
                </div>
            )}

            {activeMaskId && (
                 <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-red-900/80 border border-red-500/50 text-white px-4 py-2 rounded-full text-xs font-bold tracking-wide z-50 shadow-xl flex items-center gap-2 pointer-events-none">
                    <span className="w-4 h-4">{Icons.Brush}</span>
                    PAINT TO MASK AREA
                </div>
            )}

            {/* Custom Cursor for Brush */}
            {activeMaskId && !isPanning && (
                <div 
                    className="fixed pointer-events-none rounded-full border border-white/50 bg-white/10 z-[60]"
                    style={{
                        width: brushSize * zoom, 
                        height: brushSize * zoom,
                        // We can't easily track mouse perfectly here without a global listener,
                        // so we rely on the fact that the cursor is usually hidden or replaced.
                        // Actually, creating a DOM element to follow mouse is laggy in React.
                        // Let's just use cursor styles where possible, or accept system cursor.
                        // Better approach: Standard cursor crosshair.
                        display: 'none' 
                    }}
                />
            )}
            
            <div 
                ref={containerRef}
                className={`relative inline-block shadow-2xl shadow-black/50 
                    ${activeMaskId ? 'cursor-crosshair' : ''}
                    ${!activeMaskId && (isStraightenToolActive || isColorPickerActive) ? 'cursor-crosshair' : ''}
                    ${!activeMaskId && zoom > 1 && !isStraightenToolActive && !isColorPickerActive ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}
                `}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <canvas 
                    ref={canvasRef} 
                    className="max-w-full max-h-[calc(100vh-8rem)] object-contain block pointer-events-none transition-transform duration-75"
                    style={{ 
                        opacity: isProcessing || isLoadingFile ? 0.8 : 1,
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` 
                    }}
                />
                
                {/* Overlay Canvas for Mask Visualization */}
                <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-75 mix-blend-normal"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        opacity: activeMaskId ? 1 : 0 // Only show when masking active? Or check showMaskOverlay
                    }}
                />

                {/* SVG Overlay for Straighten Tool */}
                {isStraightenToolActive && dragStart && dragCurrent && (
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible" style={{zIndex: 100}}>
                        <line x1={dragStart.x} y1={dragStart.y} x2={dragCurrent.x} y2={dragCurrent.y} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4"/>
                        <circle cx={dragStart.x} cy={dragStart.y} r="4" fill="#3b82f6" />
                        <circle cx={dragCurrent.x} cy={dragCurrent.y} r="4" fill="#3b82f6" />
                    </svg>
                )}
            </div>
        </main>

        {/* Right: Sidebar Controls */}
        <aside className="w-[320px] bg-[#050505] border-l border-neutral-900 flex flex-col shrink-0 z-20">
            
            {/* Histogram */}
            <div className="p-4 border-b border-neutral-900 bg-black/50">
                <Histogram imageData={previewData} />
            </div>

            {/* Tools */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* SELECTIVE EDITING SECTION */}
                <SidebarSection title="Selective Edits (Masks)" defaultOpen={!!activeMaskId}>
                    <div className="flex gap-2 mb-4">
                         <button 
                            onClick={addMask}
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                        >
                            <div className="w-4 h-4">{Icons.Plus}</div> Add Mask
                        </button>
                    </div>

                    <div className="space-y-2 mb-4">
                        {imageState.masks.map(mask => (
                            <div 
                                key={mask.id} 
                                className={`
                                    group flex items-center justify-between p-2 rounded border cursor-pointer transition-all
                                    ${activeMaskId === mask.id ? 'bg-neutral-800 border-blue-500' : 'border-neutral-800 hover:border-neutral-600'}
                                `}
                                onClick={() => setActiveMaskId(mask.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setImageState(prev => ({
                                                ...prev,
                                                masks: prev.masks.map(m => m.id === mask.id ? { ...m, isVisible: !m.isVisible } : m)
                                            }));
                                        }}
                                        className={`w-4 h-4 ${mask.isVisible ? 'text-white' : 'text-neutral-600'}`}
                                    >
                                        {mask.isVisible ? Icons.Eye : Icons.EyeOff}
                                    </button>
                                    <span className="text-xs font-bold text-neutral-300">{mask.name}</span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeMask(mask.id); }}
                                    className="text-neutral-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <div className="w-4 h-4">{Icons.Trash}</div>
                                </button>
                            </div>
                        ))}
                    </div>

                    {activeMask && (
                        <div className="bg-neutral-900/30 rounded p-3 border border-neutral-800 animate-slideDown">
                            <div className="text-[10px] font-bold uppercase text-blue-400 mb-3 border-b border-neutral-800 pb-1">
                                Brush Settings
                            </div>
                            
                            {/* Brush Controls */}
                            <div className="flex gap-2 mb-3">
                                <button 
                                    onClick={() => setIsErasing(false)}
                                    className={`flex-1 py-1 text-[10px] font-bold uppercase rounded ${!isErasing ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                                >
                                    Paint
                                </button>
                                <button 
                                    onClick={() => setIsErasing(true)}
                                    className={`flex-1 py-1 text-[10px] font-bold uppercase rounded ${isErasing ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                                >
                                    Erase
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between mb-3">
                                 <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-neutral-400 cursor-pointer">
                                     <input 
                                        type="checkbox" 
                                        checked={showMaskOverlay} 
                                        onChange={(e) => setShowMaskOverlay(e.target.checked)}
                                        className="w-3 h-3 bg-neutral-800 border-neutral-600 rounded"
                                     />
                                     Show Overlay
                                 </label>
                            </div>

                            <Slider label="Brush Size" min={5} max={200} value={brushSize} onChange={setBrushSize} />
                            <Slider label="Softness" min={0} max={100} value={100 - brushHardness} onChange={(v) => setBrushHardness(100 - v)} />

                            <div className="text-[10px] font-bold uppercase text-blue-400 mt-4 mb-2 border-b border-neutral-800 pb-1">
                                Mask Adjustments
                            </div>
                            <Slider label="Exposure" min={-100} max={100} value={activeMask.settings.exposure} onChange={(v) => updateMaskSettings(activeMask.id, 'exposure', v)} />
                            <Slider label="Brightness" min={-100} max={100} value={activeMask.settings.brightness} onChange={(v) => updateMaskSettings(activeMask.id, 'brightness', v)} />
                            <Slider label="Contrast" min={-100} max={100} value={activeMask.settings.contrast} onChange={(v) => updateMaskSettings(activeMask.id, 'contrast', v)} />
                            <Slider label="Saturation" min={-100} max={100} value={activeMask.settings.saturation} onChange={(v) => updateMaskSettings(activeMask.id, 'saturation', v)} />
                            <Slider label="Warmth" min={-100} max={100} value={activeMask.settings.warmth} onChange={(v) => updateMaskSettings(activeMask.id, 'warmth', v)} />
                            <Slider label="Structure" min={0} max={100} value={activeMask.settings.structure} onChange={(v) => updateMaskSettings(activeMask.id, 'structure', v)} />
                            
                            <div className="text-[10px] font-bold uppercase text-blue-400 mt-4 mb-2 border-b border-neutral-800 pb-1">
                                Color Mixer
                            </div>
                            <ColorMixer 
                                colorGrade={activeMask.settings.colorGrade}
                                activeChannel={activeColorChannel}
                                isPickerActive={isColorPickerActive}
                                onChannelSelect={setActiveColorChannel}
                                onChange={updateMaskColorGrade}
                                onTogglePicker={() => {
                                    setIsColorPickerActive(!isColorPickerActive);
                                    setIsStraightenToolActive(false);
                                }}
                            />

                            <button 
                                onClick={() => setActiveMaskId(null)}
                                className="w-full mt-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded text-xs font-bold uppercase"
                            >
                                Done / Apply
                            </button>
                        </div>
                    )}
                </SidebarSection>

                <SidebarSection title="Global: Light & Color">
                    <Slider label="Exposure" min={-100} max={100} value={imageState.brightness} onChange={(v) => updateState('brightness', v)} onReset={() => updateState('brightness', 0)} />
                    <Slider label="Contrast" min={-100} max={100} value={imageState.contrast} onChange={(v) => updateState('contrast', v)} onReset={() => updateState('contrast', 0)} />
                    <Slider label="Highlights" min={-100} max={100} value={imageState.highlights} onChange={(v) => updateState('highlights', v)} onReset={() => updateState('highlights', 0)} />
                    <Slider label="Shadows" min={-100} max={100} value={imageState.shadows} onChange={(v) => updateState('shadows', v)} onReset={() => updateState('shadows', 0)} />
                    <div className="h-px bg-neutral-900 my-2"></div>
                    <Slider label="Saturation" min={-100} max={100} value={imageState.saturation} onChange={(v) => updateState('saturation', v)} onReset={() => updateState('saturation', 0)} />
                    <Slider label="Warmth" min={-100} max={100} value={imageState.warmth} onChange={(v) => updateState('warmth', v)} onReset={() => updateState('warmth', 0)} />
                    <Slider label="Tint" min={-100} max={100} value={imageState.tint} onChange={(v) => updateState('tint', v)} onReset={() => updateState('tint', 0)} />
                    <Slider label="Ambiance" min={-100} max={100} value={imageState.ambiance} onChange={(v) => updateState('ambiance', v)} onReset={() => updateState('ambiance', 0)} />
                </SidebarSection>

                <SidebarSection title="Global: Color Mixer">
                    <ColorMixer 
                        colorGrade={imageState.colorGrade}
                        activeChannel={activeColorChannel}
                        isPickerActive={isColorPickerActive}
                        onChannelSelect={setActiveColorChannel}
                        onChange={updateColorGrade}
                        onTogglePicker={() => {
                            setIsColorPickerActive(!isColorPickerActive);
                            setIsStraightenToolActive(false);
                            setActiveMaskId(null); // Disable masking if picking color
                        }}
                    />
                </SidebarSection>

                <SidebarSection title="Global: Details & Effects">
                    <Slider label="Structure" min={0} max={100} value={imageState.structure} onChange={(v) => updateState('structure', v)} onReset={() => updateState('structure', 0)} />
                    <Slider label="Sharpening" min={0} max={100} value={imageState.sharpening} onChange={(v) => updateState('sharpening', v)} onReset={() => updateState('sharpening', 0)} />
                    <Slider label="Dehaze" min={0} max={100} value={imageState.dehaze} onChange={(v) => updateState('dehaze', v)} onReset={() => updateState('dehaze', 0)} />
                    <div className="h-px bg-neutral-900 my-2"></div>
                    <Slider label="Grain" min={0} max={100} value={imageState.grain} onChange={(v) => updateState('grain', v)} onReset={() => updateState('grain', 0)} />
                    <Slider label="Vignette" min={0} max={100} value={imageState.vignette} onChange={(v) => updateState('vignette', v)} onReset={() => updateState('vignette', 0)} />
                </SidebarSection>

                <SidebarSection title="Geometry" defaultOpen={false}>
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Angle / Straighten</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        setIsStraightenToolActive(!isStraightenToolActive);
                                        setIsColorPickerActive(false);
                                        setActiveMaskId(null);
                                    }}
                                    className={`p-1.5 rounded border transition-all ${isStraightenToolActive ? 'bg-blue-600 border-blue-600 text-white' : 'border-neutral-700 text-neutral-400 hover:text-white'}`}
                                    title="Straighten Tool (Draw Line)"
                                >
                                    <div className="w-4 h-4">{Icons.Ruler}</div>
                                </button>
                            </div>
                        </div>
                        <Slider label="Angle" min={-45} max={45} value={imageState.straighten} onChange={(v) => updateState('straighten', v)} onReset={() => updateState('straighten', 0)} />
                        
                        <div className="mt-3 flex items-center">
                            <input 
                                type="checkbox" 
                                id="constrain-crop"
                                checked={imageState.constrain}
                                onChange={(e) => updateState('constrain', e.target.checked)}
                                className="w-3 h-3 rounded bg-neutral-800 border-neutral-600 checked:bg-white focus:ring-0 focus:ring-offset-0"
                            />
                            <label htmlFor="constrain-crop" className="ml-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 cursor-pointer select-none">
                                Constrain to Image (Auto Crop)
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <button 
                            onClick={() => updateState('rotation', (imageState.rotation - 90 + 360) % 360)}
                            className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-colors border border-transparent"
                            title="Rotate Left (90° CCW)"
                        >
                             <RotateCcw className="w-4 h-4" />
                             <span className="text-[9px] uppercase tracking-wider font-semibold">CCW</span>
                        </button>
                        <button 
                            onClick={() => updateState('rotation', (imageState.rotation + 90) % 360)}
                            className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-colors border border-transparent"
                            title="Rotate Right (90° CW)"
                        >
                             <RotateCw className="w-4 h-4" />
                             <span className="text-[9px] uppercase tracking-wider font-semibold">CW</span>
                        </button>
                        <button 
                            onClick={() => updateState('flipH', !imageState.flipH)}
                            className={`py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-all border
                                ${imageState.flipH ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white border-transparent hover:bg-neutral-800'}
                            `}
                            title="Flip Horizontally (Left-Right Mirror)"
                        >
                             <FlipHorizontal className="w-4 h-4" />
                             <span className="text-[9px] uppercase tracking-wider font-semibold">Flip H</span>
                        </button>
                        <button 
                            onClick={() => updateState('flipV', !imageState.flipV)}
                            className={`py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-all border
                                ${imageState.flipV ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white border-transparent hover:bg-neutral-800'}
                            `}
                            title="Flip Vertically (Up-Down Mirror)"
                        >
                             <FlipVertical className="w-4 h-4" />
                             <span className="text-[9px] uppercase tracking-wider font-semibold">Flip V</span>
                        </button>
                    </div>
                </SidebarSection>

            </div>
        </aside>

      </div>

      {/* Floating Exporting/Download Loader */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0, y: 15, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 15, x: "-50%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 z-[100] flex items-center gap-3.5 bg-neutral-900/95 border border-neutral-800 text-white px-5 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-100">Exporting Photo</span>
              <span className="text-[9px] text-neutral-400 mt-1">Applying style filters, color grading & adjustments...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;
