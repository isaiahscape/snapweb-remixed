
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_IMAGE_STATE, ImageState, ColorChannel, ColorAdjustment, MaskLayer, DEFAULT_MASK_SETTINGS, DEFAULT_COLOR_GRADE, LOOKS_PRESETS, LookPreset } from './types';
import { processImage, generateResultUrl, loadRawImage, getClosestColorChannel } from './services/imageProcessor';
import Histogram from './components/Histogram';
import { CurvesEditor } from './components/CurvesEditor';
import { Slider, ToolButton, IconButton } from './components/Controls';
import Cropper from './components/Cropper';
import ColorMixer from './components/ColorMixer';
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Loader2, FolderOpen, Cloud, LogOut, RefreshCw, Globe, Settings2, ArrowLeft, AlertCircle, ZoomIn, ZoomOut, Maximize2, Upload as LucideUpload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Modern Phosphor-style Icons (SVG)
const Icons = {
  Upload: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Download: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Undo: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="square" strokeLinejoin="miter" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
  Compare: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M9 12l-3 3 3 3M15 12l3 3-3 3" /></svg>,
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [exportQuality, setExportQuality] = useState<number>(0.95);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Floating Exposure Histogram visibility state (defaults to false for clean preview focus)
  const [showHistogram, setShowHistogram] = useState<boolean>(false);

  // Workspace configuration (sidebar position left/right, show/hide UI for review)
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    try {
      const saved = localStorage.getItem('snapweb_sidebar_position');
      return (saved === 'left' || saved === 'right') ? saved : 'right';
    } catch {
      return 'right';
    }
  });
  const [hideUI, setHideUI] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const widthDelta = sidebarPosition === 'right' ? -deltaX : deltaX;
      const newWidth = Math.max(260, Math.min(600, startWidth + widthDelta));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, sidebarPosition]);

  const toggleSidebarPosition = () => {
    const next = sidebarPosition === 'right' ? 'left' : 'right';
    setSidebarPosition(next);
    try {
      localStorage.setItem('snapweb_sidebar_position', next);
    } catch (e) {}
    showToast(`Sidebar docked ${next}!`, 'success');
  };

  // Copy/Paste Settings and Custom Toast Notifications
  const [copiedSettings, setCopiedSettings] = useState<Partial<ImageState> | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Toast effect for autohide
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load cached settings on mount if available in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('snapweb_copied_settings');
      if (stored) {
        setCopiedSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse cached settings from localStorage", e);
    }
  }, []);

  // Keyboard shortcut listener for review mode (Tab toggles interface HUD, Escape restores)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setHideUI(prev => {
          const next = !prev;
          showToast(next ? "Interface hidden. Press TAB to restore." : "Interface restored.", "success");
          return next;
        });
      } else if (e.key === 'Escape' && hideUI) {
        e.preventDefault();
        setHideUI(false);
        showToast("Interface restored.", "success");
      } else if (e.key?.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHistogram(prev => {
          const next = !prev;
          showToast(next ? "Histogram overlay active." : "Histogram hidden.", "success");
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hideUI]);

  // Dynamic Scrollbar autohide handler (3 seconds inactivity)
  useEffect(() => {
    const activeTimeouts = new Map<HTMLElement, any>();

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.classList || !target.classList.contains('custom-scrollbar')) {
        return;
      }

      // Add scrolling class to display scrollbar
      target.classList.add('is-scrolling');

      // Clear any pending autohide timeout for this element
      if (activeTimeouts.has(target)) {
        clearTimeout(activeTimeouts.get(target));
      }

      // Set timeout to hide the scrollbar after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        target.classList.remove('is-scrolling');
        activeTimeouts.delete(target);
      }, 3000);

      activeTimeouts.set(target, timeout);
    };

    // Capture phase listener to intercept all scroll events page-wide
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      activeTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);
  
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

  // Snapseed Tab-based & Tool States
  const [activePanelTab, setActivePanelTab] = useState<'looks' | 'tune' | 'creative' | 'local' | 'geometry'>('tune');
  const [appliedLookId, setAppliedLookId] = useState<string | null>(null);
  const [isAddingSelective, setIsAddingSelective] = useState(false);
  const [focusedSelectiveId, setFocusedSelectiveId] = useState<string | null>(null);
  const [isHealingBrushActive, setIsHealingBrushActive] = useState(false);
  const [isPaintingHealing, setIsPaintingHealing] = useState(false);
  const [healingStrokeInProgress, setHealingStrokeInProgress] = useState<any | null>(null);
  const [healingBrushSize, setHealingBrushSize] = useState(25);
  const [draggingPointType, setDraggingPointType] = useState<{ type: 'selective' | 'lensBlur'; id?: string } | null>(null);

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

  const createProceduralSampleImage = (): HTMLImageElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Gradient sky (deep evening to orange warm horizon)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 1280);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.3, '#1e1b4b');
      skyGrad.addColorStop(0.6, '#581c87');
      skyGrad.addColorStop(0.8, '#9d174d');
      skyGrad.addColorStop(1, '#f97316');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 1920, 1280);

      // Glowing Sun/Sunset
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 150;
      ctx.beginPath();
      ctx.arc(960, 800, 120, 0, Math.PI * 2);
      ctx.fillStyle = '#ffedd5';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Far mountain range
      ctx.beginPath();
      ctx.moveTo(0, 1280);
      for (let x = 0; x <= 1920; x += 10) {
        const y = 850 - Math.sin((x / 1920) * Math.PI * 2) * 100 - Math.cos((x / 1920) * Math.PI * 8) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1920, 1280);
      ctx.fillStyle = '#4a044e';
      ctx.fill();

      // Mid mountain range
      ctx.beginPath();
      ctx.moveTo(0, 1280);
      for (let x = 0; x <= 1920; x += 10) {
        const y = 920 - Math.sin((x / 1920) * Math.PI * 3.5) * 70 + Math.cos((x / 1920) * Math.PI * 14) * 10;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1920, 1280);
      ctx.fillStyle = '#310a5d';
      ctx.fill();

      // Foreground Hills
      ctx.beginPath();
      ctx.moveTo(0, 1280);
      for (let x = 0; x <= 1920; x += 10) {
        const y = 1000 - Math.sin((x / 1920) * Math.PI * 5) * 45;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1920, 1280);
      ctx.fillStyle = '#111827';
      ctx.fill();

      // Lake reflection area
      const waterGrad = ctx.createLinearGradient(0, 1000, 0, 1280);
      waterGrad.addColorStop(0, '#111827');
      waterGrad.addColorStop(0.1, '#1e1b4b');
      waterGrad.addColorStop(1, '#311042');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 1000, 1920, 280);

      // Specular pathway
      const sunReflection = ctx.createLinearGradient(820, 0, 1100, 0);
      sunReflection.addColorStop(0, 'rgba(249, 115, 22, 0)');
      sunReflection.addColorStop(0.5, 'rgba(253, 224, 71, 0.45)');
      sunReflection.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = sunReflection;
      ctx.fillRect(820, 1000, 280, 280);

      // Simple reflection water lines
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.2)';
      ctx.lineWidth = 1.5;
      for (let rLine = 1010; rLine < 1260; rLine += 20) {
        ctx.beginPath();
        const width = (1280 - rLine) * 1.5;
        ctx.moveTo(960 - width / 2, rLine);
        ctx.lineTo(960 + width / 2, rLine);
        ctx.stroke();
      }
    }
    const img = new Image();
    img.src = canvas.toDataURL('image/jpeg', 0.95);
    return img;
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
      console.log("No internet context: rendering gorgeous on-device procedural landscape sunset");
      try {
        const fallImg = createProceduralSampleImage();
        fallImg.onload = () => {
          setSourceImage(fallImg);
          setIsRaw(false);
          setImageState(DEFAULT_IMAGE_STATE);
          setActiveMaskId(null);
          setIsLoadingFile(false);
        };
      } catch (err) {
        setIsLoadingFile(false);
        alert("Failed to load sample image.");
      }
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

  // Lock page-wide browser zoom globally (wheel ctrlKey, pinch gestures on Safari/Chrome)
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // Prevent browser layout zoom globally (e.ctrlKey is true for pinch-to-zoom on Chromebooks/macOS trackpads and ctrl + wheel)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    const handleGesture = (e: Event) => {
      // Prevent trackpad zoom gestures in Safari from scaling the entire page
      e.preventDefault();
    };

    // Use passive: false to allow calling e.preventDefault()
    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    window.addEventListener('gesturestart', handleGesture, { passive: false });
    window.addEventListener('gesturechange', handleGesture, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      window.removeEventListener('gesturestart', handleGesture);
      window.removeEventListener('gesturechange', handleGesture);
    };
  }, []);

  // Attach a native, non-passive wheel event listener on the workspace container to handle custom image-only zoom
  useEffect(() => {
    const handleWorkspaceWheel = (e: WheelEvent) => {
      // Trigger zoom of image if Alt, Ctrl, or Cmd is active (which includes standard pinch-to-zoom on trackpad)
      if (e.altKey || e.ctrlKey || e.metaKey) {
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

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWorkspaceWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWorkspaceWheel);
      }
    };
  }, [zoom, pan]);

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

  const handleDownload = async (format: 'jpeg' | 'png' = exportFormat, quality: number = exportQuality) => {
    if (!sourceImage) return;
    setIsExporting(true);
    setShowExportModal(false);
    
    // setTimeout allows the browser main thread to paint the export dialog/loader
    // before executing heavy canvas/image manipulation tasks.
    setTimeout(async () => {
      try {
        const url = await generateResultUrl(sourceImage, imageState, format, quality);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snapweb-edit-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
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
          setAppliedLookId(null);
      }
  }

  const applyLook = (lookAdjustments: Partial<ImageState>, lookId: string) => {
    setImageState(prev => ({
      ...prev,
      // Reset styling adjustments back to default before applying
      rawTemperature: DEFAULT_IMAGE_STATE.rawTemperature,
      rawTint: DEFAULT_IMAGE_STATE.rawTint,
      rawExposureEV: DEFAULT_IMAGE_STATE.rawExposureEV,
      rawHighlights: DEFAULT_IMAGE_STATE.rawHighlights,
      rawShadows: DEFAULT_IMAGE_STATE.rawShadows,
      rawProfile: DEFAULT_IMAGE_STATE.rawProfile,
      
      brightness: DEFAULT_IMAGE_STATE.brightness,
      contrast: DEFAULT_IMAGE_STATE.contrast,
      saturation: DEFAULT_IMAGE_STATE.saturation,
      ambiance: DEFAULT_IMAGE_STATE.ambiance,
      warmth: DEFAULT_IMAGE_STATE.warmth,
      tint: DEFAULT_IMAGE_STATE.tint,
      highlights: DEFAULT_IMAGE_STATE.highlights,
      shadows: DEFAULT_IMAGE_STATE.shadows,
      
      structure: DEFAULT_IMAGE_STATE.structure,
      tonalContrast: DEFAULT_IMAGE_STATE.tonalContrast,
      tonalHighTones: DEFAULT_IMAGE_STATE.tonalHighTones,
      tonalMidTones: DEFAULT_IMAGE_STATE.tonalMidTones,
      tonalLowTones: DEFAULT_IMAGE_STATE.tonalLowTones,
      tonalProtectShadows: DEFAULT_IMAGE_STATE.tonalProtectShadows,
      tonalProtectHighlights: DEFAULT_IMAGE_STATE.tonalProtectHighlights,
      sharpening: DEFAULT_IMAGE_STATE.sharpening,
      dehaze: DEFAULT_IMAGE_STATE.dehaze,
      grain: DEFAULT_IMAGE_STATE.grain,
      vignette: DEFAULT_IMAGE_STATE.vignette,
      colorGrade: { ...DEFAULT_IMAGE_STATE.colorGrade },
      curves: { 
        rgb: [...DEFAULT_IMAGE_STATE.curves.rgb],
        r: [...DEFAULT_IMAGE_STATE.curves.r],
        g: [...DEFAULT_IMAGE_STATE.curves.g],
        b: [...DEFAULT_IMAGE_STATE.curves.b]
      },
      hdrScape: { ...DEFAULT_IMAGE_STATE.hdrScape },
      grainyFilm: { ...DEFAULT_IMAGE_STATE.grainyFilm },
      
      // Merge Look values on top
      ...lookAdjustments,
    }));
    setAppliedLookId(lookId);
    showToast(`Applied Look: ${LOOKS_PRESETS.find(p => p.id === lookId)?.name || lookId}`, "success");
  };

  const handleCopySettings = async () => {
    if (!sourceImage) return;
    
    const stylingSettings: Partial<ImageState> = {
      rawTemperature: imageState.rawTemperature,
      rawTint: imageState.rawTint,
      rawExposureEV: imageState.rawExposureEV,
      rawHighlights: imageState.rawHighlights,
      rawShadows: imageState.rawShadows,
      rawProfile: imageState.rawProfile,
      brightness: imageState.brightness,
      contrast: imageState.contrast,
      saturation: imageState.saturation,
      ambiance: imageState.ambiance,
      warmth: imageState.warmth,
      tint: imageState.tint,
      highlights: imageState.highlights,
      shadows: imageState.shadows,
      structure: imageState.structure,
      sharpening: imageState.sharpening,
      dehaze: imageState.dehaze,
      grain: imageState.grain,
      vignette: imageState.vignette,
      colorGrade: imageState.colorGrade,
    };

    setCopiedSettings(stylingSettings);
    localStorage.setItem('snapweb_copied_settings', JSON.stringify(stylingSettings));

    try {
      const jsonStr = JSON.stringify(stylingSettings, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      showToast("Edit settings copied to clipboard!", "success");
    } catch (err) {
      // Elegant fallback for preview context frames
      showToast("Settings copied to memory!", "success");
    }
  };

  const handlePasteSettings = async () => {
    if (!sourceImage) return;

    let targetSettings = copiedSettings;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim().startsWith('{')) {
          const parsed = JSON.parse(clipText);
          if (typeof parsed.brightness === 'number' || typeof parsed.rawExposureEV === 'number') {
            targetSettings = parsed;
          }
        }
      }
    } catch (e) {
      console.log("Clipboard read not permitted or failed, falling back to local slot", e);
    }

    if (!targetSettings) {
      showToast("No copied settings available! Please copy adjustments first.", "error");
      return;
    }

    const validKeys: (keyof ImageState)[] = [
      'rawTemperature', 'rawTint', 'rawExposureEV', 'rawHighlights', 'rawShadows', 'rawProfile',
      'brightness', 'contrast', 'saturation', 'ambiance', 'warmth', 'tint', 'highlights', 'shadows',
      'structure', 'sharpening', 'dehaze', 'grain', 'vignette', 'colorGrade'
    ];

    setImageState(prev => {
      const updated = { ...prev };
      validKeys.forEach(k => {
        if (targetSettings && targetSettings[k] !== undefined) {
          // @ts-ignore
          updated[k] = targetSettings[k];
        }
      });
      return updated;
    });

    showToast("Edit settings applied successfully!", "success");
  };

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

  // --- Zoom Interaction is now handled natively via the non-passive wheel event listener hooks ---

  // --- Canvas Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !canvasRef.current) return;

    // 0.0 Snapseed Selective Point Addition
    if (isAddingSelective) {
        const rect = canvasRef.current.getBoundingClientRect();
        const percentX = ((e.clientX - rect.left) / rect.width) * 100;
        const percentY = ((e.clientY - rect.top) / rect.height) * 100;
        
        const newPt = {
            id: 'sel_' + Date.now(),
            x: Math.max(0, Math.min(100, percentX)),
            y: Math.max(0, Math.min(100, percentY)),
            radius: 20, // default radius 20%
            brightness: 0,
            contrast: 0,
            saturation: 0,
            structure: 0
        };
        
        setImageState(prev => ({
            ...prev,
            selectivePoints: [...(prev.selectivePoints || []), newPt]
        }));
        setFocusedSelectiveId(newPt.id);
        setIsAddingSelective(false);
        return;
    }

    // 0.1 Snapseed Healing Brush Stroke Start
    if (isHealingBrushActive) {
        setIsPaintingHealing(true);
        const rect = canvasRef.current.getBoundingClientRect();
        const percentX = ((e.clientX - rect.left) / rect.width) * 100;
        const percentY = ((e.clientY - rect.top) / rect.height) * 100;
        
        const newStroke = {
            id: 'heal_' + Date.now(),
            points: [{ x: percentX, y: percentY }],
            size: healingBrushSize
        };
        setHealingStrokeInProgress(newStroke);
        return;
    }

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
    // 0.0 Dragging viewport points (Selective / Lens blur center)
    if (draggingPointType && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const ptX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const ptY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        
        if (draggingPointType.type === 'selective') {
            setImageState(prev => {
                const list = (prev.selectivePoints || []).map(p => {
                    if (p.id === draggingPointType.id) {
                        return { ...p, x: ptX, y: ptY };
                    }
                    return p;
                });
                return { ...prev, selectivePoints: list };
            });
        } else if (draggingPointType.type === 'lensBlur') {
            setImageState(prev => {
                if (!prev.lensBlur) return prev;
                return {
                    ...prev,
                    lensBlur: {
                        ...prev.lensBlur,
                        x: ptX,
                        y: ptY
                    }
                };
            });
        }
        return;
    }

    // 0.1 Healing draw
    if (isPaintingHealing && healingStrokeInProgress && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const ptX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const ptY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        
        setHealingStrokeInProgress(prev => {
            if (!prev) return null;
            return {
                ...prev,
                points: [...prev.points, { x: ptX, y: ptY }]
            };
        });
        return;
    }

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
    // 0.0 Snapseed Viewport Point Drills Reset
    if (draggingPointType) {
        setDraggingPointType(null);
        // Force state update to trigger image processing
        setImageState(prev => ({ ...prev }));
        return;
    }

    // 0.1 Snapseed Healing Brush Stroke Finish
    if (isPaintingHealing && healingStrokeInProgress) {
        setIsPaintingHealing(false);
        setImageState(prev => ({
            ...prev,
            healingStrokes: [...(prev.healingStrokes || []), healingStrokeInProgress]
        }));
        setHealingStrokeInProgress(null);
        return;
    }

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
        className="flex flex-col h-screen w-full bg-black text-white font-sans overflow-y-auto selection:bg-white selection:text-black"
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
            <div className="font-bold tracking-[0.18em] text-xs text-white uppercase">
              SNAPSEED <span className="text-neutral-500 font-normal text-[10px]">FOR WEB</span>
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
              Snapseed for Web provides state-of-the-art selective editing, color grading, and on-device processing. No cloud uploads, complete privacy, absolute speed.
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
                          className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition cursor-pointer flex items-center justify-center gap-2.5 shadow-lg"
                        >
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <radialGradient id="A" cx="-254.817" cy="705.837" gradientTransform="matrix(2.827,1.16322,-1.16322,2.827,1967.2161,-1760.7166)" gradientUnits="userSpaceOnUse" r="82.973">
                                <stop offset="0" stopColor="#ffd24d"/>
                                <stop offset="1" stopColor="#f6c338"/>
                              </radialGradient>
                              <radialGradient id="B" cx="-254.82" cy="705.836" gradientTransform="matrix(2.827,1.16322,-1.16322,2.827,1967.2161,-1760.7166)" gradientUnits="userSpaceOnUse" r="82.978">
                                <stop offset="0" stopColor="#4387fd"/>
                                <stop offset=".65" stopColor="#3078f0"/>
                                <stop offset=".91" stopColor="#2b72ea"/>
                                <stop offset="1" stopColor="#286ee6"/>
                              </radialGradient>
                            </defs>
                            <g transform="matrix(.460432 0 0 .460432 57.509647 126.82041)">
                              <path d="M-100.704-145.738l-24.2-41.9 45.3-78.5 24.2 41.9z" fill="#0da960"/>
                              <path d="M-100.704-145.738l24.2-41.9h90.6l-24.2 41.9z" fill="url(#B)"/>
                              <path d="M14.096-187.638h-48.4l-45.3-78.5h48.4z" fill="url(#A)"/>
                              <path d="M-55.404-187.638h-21.1l10.5-18.3-34.7 60.2z" fill="#2d6fdd"/>
                              <path d="M-34.304-187.638h48.4l-58.9-18.3z" fill="#e5b93c"/>
                              <path d="M-66.004-205.938l10.6-18.3-24.2-41.9z" fill="#0c9b57"/>
                            </g>
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

        {/* Footprint credit footer */}
        <footer className="py-6 border-t border-neutral-900 flex flex-col items-center justify-center text-center gap-3 px-8 text-[11px] text-neutral-400 font-sans shrink-0 select-text bg-black/40">
          <p className="leading-relaxed">
            Recreated by <a href="https://isaiahthings.me" target="_blank" rel="noopener noreferrer" className="text-neutral-200 hover:text-blue-400 font-medium transition-colors underline decoration-neutral-800 hover:decoration-blue-400">Leonardo (@isaiahscape)</a>, generated initially with Google AI Studio by <a href="https://www.reddit.com/user/BetterAtPS" target="_blank" rel="noopener noreferrer" className="text-neutral-200 hover:text-blue-400 font-medium transition-colors underline decoration-neutral-800 hover:decoration-blue-400">u/BetterAtPS</a> on Reddit.
          </p>
          <p className="leading-relaxed">
            Snapseed for Web is not affiliated by Google, this project is a reverse-engineered web version of Snapseed.
          </p>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Source is at <a href="https://github.com/isaiahscape/snapweb-remixed" target="_blank" rel="noopener noreferrer" className="text-neutral-200 hover:text-blue-400 font-medium transition-colors underline decoration-neutral-800 hover:decoration-blue-400">isaiahscape/snapweb-remixed</a>
          </p>
          <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-[0.2em] mt-1">
            Snapseed for Web • Secure Browser Image Engine
          </p>
        </footer>

      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden font-sans select-none">
      
      {/* Top Navigation */}
      <header className={`h-14 bg-black border-b border-neutral-900 flex justify-between items-center px-2 sm:px-4 shrink-0 z-30 transition-all duration-300 ${hideUI ? '-mt-14 opacity-0 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-1 sm:gap-4 md:gap-6">
            <button 
              onClick={() => {
                setShowCloseConfirm(true);
              }}
              className="text-neutral-400 hover:text-white flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors mr-0.5 sm:mr-1 cursor-pointer bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-1.5 sm:px-2.5 py-1.5 rounded"
              title="Close Image and Return"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden min-[450px]:inline">Close</span>
            </button>
            <div className="font-bold tracking-[0.2em] text-xs sm:text-sm text-white hidden md:block uppercase">
                SNAPSEED <span className="text-neutral-600 font-normal text-[10px] sm:text-xs">FOR WEB</span>
            </div>
            <div className="h-6 w-px bg-neutral-800 hidden md:block"></div>
            <div className="flex gap-1 sm:gap-2">
                <ToolButton onClick={() => fileInputRef.current?.click()} className="px-2 sm:px-4 py-1.5" title="Open Image">
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                        <span className="w-3.5 h-3.5 sm:w-4 sm:h-4">{Icons.Upload}</span>
                        <span className="hidden min-[480px]:inline">OPEN</span>
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
                    <ToolButton onClick={() => setIsCropMode(true)} className="px-2 sm:px-4 py-1.5" title="Crop Image">
                        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4">{Icons.Crop}</span>
                            <span className="hidden min-[540px]:inline">CROP</span>
                        </div>
                    </ToolButton>
                )}
            </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
             {isRaw && (
                 <div className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-neutral-800 text-yellow-500 border border-neutral-700 mr-0.5 sm:mr-2 whitespace-nowrap">
                     RAW
                 </div>
             )}
             {/* Show warning if masking is active */}
             {activeMaskId && (
                 <div className="flex items-center gap-1 sm:gap-2 mr-0.5 sm:mr-4 animate-pulse text-red-500 text-[9px] sm:text-xs font-bold uppercase tracking-wider border border-red-900/50 bg-red-900/10 px-1.5 sm:px-3 py-1 rounded">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                    <span className="hidden sm:inline">Masking Mode Active</span>
                    <span className="inline sm:hidden">Masking</span>
                 </div>
             )}

             {JSON.stringify(imageState) !== JSON.stringify(DEFAULT_IMAGE_STATE) && (
                 <IconButton 
                    icon={Icons.Undo} 
                    onClick={handleReset} 
                    title="Reset All"
                    className="hover:bg-neutral-900 p-1.5 sm:p-2"
                  />
             )}
             {sourceImage && (
               <>
                 <IconButton 
                    icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} 
                    onClick={handleCopySettings} 
                    title="Copy Adjustments"
                    className="hover:bg-neutral-900 p-1.5 sm:p-2 hover:text-amber-500 transition-colors"
                  />
                 <IconButton 
                    icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-3-3v6" /></svg>} 
                    onClick={handlePasteSettings} 
                    title="Paste Adjustments"
                    className={`hover:bg-neutral-900 p-1.5 sm:p-2 transition-colors ${copiedSettings ? 'hover:text-emerald-500 text-emerald-400' : 'opacity-45 cursor-not-allowed text-neutral-500'}`}
                  />
                 <IconButton 
                    icon={sidebarPosition === 'right' ? (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19H4a2 2 0 01-2-2V7a2 2 0 012-2h5m0 14h10a2 2 0 002-2V7a2 2 0 00-2-2H9m0 14V5" /></svg>
                    ) : (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19h5a2 2 0 002-2V7a2 2 0 00-2-2h-5m0 14H5a2 2 0 01-2-2V7a2 2 0 012-2h10m0 14V5" /></svg>
                    )} 
                    onClick={toggleSidebarPosition} 
                    title={`Dock Sidebar to ${sidebarPosition === 'right' ? 'Left' : 'Right'}`}
                    className="hover:bg-neutral-900 p-1.5 sm:p-2 hover:text-sky-400 transition-colors"
                  />
                 <IconButton 
                    icon={Icons.EyeOff} 
                    onClick={() => {
                        setHideUI(true);
                        showToast("Interface hidden. Press TAB to restore.", "success");
                    }} 
                    title="Hide Interface / Review Photo (Tab)"
                    className="hover:bg-neutral-900 p-1.5 sm:p-2 hover:text-cyan-400 transition-colors"
                  />
                 <IconButton 
                    id="btn-header-histogram-toggle"
                    icon={
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className={`w-5 h-5 ${showHistogram ? 'text-cyan-400' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    } 
                    onClick={() => {
                        setShowHistogram(prev => {
                          const next = !prev;
                          showToast(next ? "Histogram overlay active." : "Histogram hidden.", "success");
                          return next;
                        });
                    }} 
                    title="Toggle Live Histogram (H)"
                    className={`p-1.5 sm:p-2 transition-colors hover:bg-neutral-900 ${showHistogram ? 'text-cyan-400 hover:text-cyan-350' : 'text-neutral-400 hover:text-white'}`}
                  />
               </>
             )}
             <button 
                onMouseDown={() => setIsComparing(true)}
                onMouseUp={() => setIsComparing(false)}
                onMouseLeave={() => setIsComparing(false)}
                onTouchStart={() => setIsComparing(true)}
                onTouchEnd={() => setIsComparing(false)}
                className="p-1.5 sm:p-2 text-neutral-400 hover:text-white transition-colors"
                title="Hold to Compare"
             >
                 <div className="w-4 h-4 sm:w-5 sm:h-5">{Icons.Compare}</div>
             </button>
             <div className="h-6 w-px bg-neutral-800 mx-0.5 sm:mx-2"></div>
              <button onClick={() => setShowExportModal(true)} className="bg-white text-black px-2 sm:px-5 py-1.5 rounded text-[10px] sm:text-xs font-bold tracking-wider hover:bg-neutral-200 transition flex items-center gap-1 sm:gap-2" title="Export Image">
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4">{Icons.Download}</div>
                <span className="hidden min-[380px]:inline">EXPORT</span>
              </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className={`flex-1 flex flex-col ${sidebarPosition === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'} overflow-hidden`}>
        
        {/* Center: Canvas */}
        <main className="flex-1 bg-[#0a0a0a] relative flex items-center justify-center p-3 sm:p-6 md:p-8 select-none overflow-hidden min-h-0 min-w-0">
             {hideUI && (
               <button 
                 onClick={() => {
                   setHideUI(false);
                   showToast("Interface restored.", "success");
                 }}
                 className="absolute top-6 left-6 z-50 flex items-center gap-2 bg-neutral-900/95 border border-neutral-800 hover:border-neutral-750 rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-sm hover:bg-neutral-850 text-neutral-300 hover:text-white transition-all cursor-pointer text-[10px] font-bold tracking-wider uppercase"
                 title="Show Editing Panel (Tab)"
               >
                 <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-cyan-400 shrink-0">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
                 <span>Show Interface</span>
               </button>
             )}

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
            >
                <canvas 
                    ref={canvasRef} 
                    className="max-w-full max-h-[calc(100vh-27rem)] md:max-h-[calc(100vh-8rem)] object-contain block pointer-events-none transition-transform duration-75"
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

            {/* Floating Zoom Controls Overlay inside Main center-view relative workspace */}
            {sourceImage && (
              <div 
                id="zoom-controls" 
                className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 rounded-lg p-1.5 z-30 shadow-2xl backdrop-blur-md select-none"
              >
                {/* Zoom Out Button */}
                <button
                  id="btn-zoom-out"
                  onClick={() => {
                    setZoom(prev => {
                      const nextZoom = Math.min(Math.max(1, prev - 0.5), 5);
                      if (nextZoom === 1) setPan({ x: 0, y: 0 });
                      return nextZoom;
                    });
                  }}
                  disabled={zoom <= 1}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 disabled:opacity-40 disabled:hover:bg-neutral-800 transition cursor-pointer flex items-center justify-center border border-neutral-700/30"
                  title="Zoom Out (Alt + Scroll Down)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                {/* Percentage Label */}
                <span 
                  id="lbl-zoom-level" 
                  className="text-[10px] font-mono text-neutral-300 font-medium text-center min-w-[42px] cursor-pointer hover:text-white"
                  title="Double-click to reset zoom"
                  onDoubleClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  {Math.round(zoom * 100)}%
                </span>

                {/* Zoom In Button */}
                <button
                  id="btn-zoom-in"
                  onClick={() => {
                    setZoom(prev => Math.min(prev + 0.5, 5));
                  }}
                  disabled={zoom >= 5}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 disabled:opacity-40 disabled:hover:bg-neutral-800 transition cursor-pointer flex items-center justify-center border border-neutral-700/30"
                  title="Zoom In (Alt + Scroll Up)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                {/* Vertical Divider */}
                <span className="w-[1px] h-4 bg-neutral-800 mx-1" />

                {/* Reset fit zoom */}
                <button
                  id="btn-zoom-reset"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                  className="p-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 disabled:opacity-40 disabled:hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase border border-neutral-700/30"
                  title="Reset Zoom & Pan"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Fit</span>
                </button>

                {/* Vertical Divider */}
                <span className="w-[1px] h-4 bg-neutral-800 mx-1" />

                {/* Histogram Toggle Button */}
                <button
                  id="btn-zoom-histogram-toggle"
                  onClick={() => {
                    setShowHistogram(prev => !prev);
                    showToast(showHistogram ? "Histogram hidden." : "Histogram overlay active.", "success");
                  }}
                  className={`p-1.5 px-2 rounded hover:bg-neutral-700 active:bg-neutral-600 transition cursor-pointer flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase border border-neutral-700/30
                    ${showHistogram ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/80 font-black' : 'bg-neutral-800 text-neutral-200 font-bold'}
                  `}
                  title="Toggle Live Histogram (H)"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>Hist</span>
                </button>
              </div>
            )}

            {/* Premium Floating Overlay Histogram at bottom left of image workspace */}
            {sourceImage && showHistogram && (
              <div 
                id="floating-histogram" 
                className="absolute bottom-6 left-6 z-30 p-2.5 rounded-xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800/90 shadow-[0_8px_32px_rgba(0,0,0,0.8)] w-56 sm:w-64 max-w-[calc(100%-3rem)] animate-slideDown select-none"
              >
                 <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-neutral-900 text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">
                     <span className="flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 bg-cyan-450 rounded-full animate-pulse"></span>
                       Exposure Histogram
                     </span>
                     <button 
                       onClick={() => {
                         setShowHistogram(false);
                         showToast("Histogram hidden.", "success");
                       }} 
                       className="text-neutral-500 hover:text-white transition-colors p-0.5 rounded hover:bg-neutral-800 cursor-pointer"
                       title="Hide Histogram"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                 </div>
                 <div className="h-16 sm:h-20 md:h-24">
                     <Histogram imageData={previewData} />
                 </div>
              </div>
            )}
        </main>

        {/* Sidebar Controls */}
        <aside 
          style={isDesktop && !hideUI ? { width: `${sidebarWidth}px`, minWidth: '260px', maxWidth: '600px' } : undefined}
          className={`w-full h-[340px] md:h-auto bg-[#050505] flex flex-col shrink-0 z-20 relative
            ${isDraggingSidebar ? '' : 'transition-all duration-300 ease-in-out'}
            ${sidebarPosition === 'left' ? 'border-t md:border-t-0 md:border-r border-neutral-900' : 'border-t md:border-t-0 md:border-l border-neutral-900'}
            ${hideUI 
              ? 'h-0 md:h-auto md:w-0 md:opacity-0 overflow-hidden pointer-events-none' 
              : 'w-full md:w-[320px] shadow-[0_-4px_24px_rgba(0,0,0,0.6)] md:shadow-none'
            }
          `}
        >
          {/* Resize Handle - Only visible on desktop when UI is not hidden */}
          {isDesktop && !hideUI && (
            <div
              onMouseDown={handleSidebarMouseDown}
              className={`absolute top-0 bottom-0 w-2.5 cursor-col-resize z-50 group hover:bg-cyan-500/10 transition-all duration-150
                ${sidebarPosition === 'left' 
                  ? 'right-[-5px] active:right-[-7px]' 
                  : 'left-[-5px] active:left-[-7px]'
                }
              `}
              title="Drag to resize sidebar"
            >
              {/* Highlight bar visible on hover/active */}
              <div className={`w-1 h-full mx-auto transition-all duration-150 rounded pointer-events-none
                ${isDraggingSidebar 
                  ? 'bg-cyan-500 w-1.5 shadow-[0_0_12px_rgba(6,182,212,0.8)]' 
                  : 'bg-transparent group-hover:bg-neutral-800'
                }
              `} />
            </div>
          )}
            


            {/* Tools */}
            {/* Elegant Snapseed horizontal control switch tab */}
            <div className="grid grid-cols-5 gap-0.5 border-b border-neutral-900 bg-neutral-950 p-1 shrink-0 select-none">
               {(['looks', 'tune', 'creative', 'local', 'geometry'] as const).map(tab => {
                  const isActive = activePanelTab === tab;
                  const labels = {
                     looks: 'Looks',
                     tune: 'Tune',
                     creative: 'Creative',
                     local: 'Local',
                     geometry: 'Geometry'
                  };
                  return (
                     <button
                        key={tab}
                        onClick={() => {
                           setActivePanelTab(tab);
                           setIsAddingSelective(false);
                           setIsHealingBrushActive(false);
                        }}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer text-center ${
                           isActive 
                              ? 'bg-neutral-800 text-white font-extrabold shadow-sm border border-neutral-700/50' 
                              : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                     >
                        {labels[tab]}
                     </button>
                  );
               })}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {activePanelTab === 'looks' && (
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-white">Choose a Look</h3>
                                <p className="text-[9px] text-neutral-500 mt-0.5">Instant professional grade style baselines</p>
                            </div>
                            {appliedLookId && (
                                <button
                                    onClick={() => {
                                      setImageState(prev => ({
                                        ...prev,
                                        rawTemperature: DEFAULT_IMAGE_STATE.rawTemperature,
                                        rawTint: DEFAULT_IMAGE_STATE.rawTint,
                                        rawExposureEV: DEFAULT_IMAGE_STATE.rawExposureEV,
                                        rawHighlights: DEFAULT_IMAGE_STATE.rawHighlights,
                                        rawShadows: DEFAULT_IMAGE_STATE.rawShadows,
                                        rawProfile: DEFAULT_IMAGE_STATE.rawProfile,
                                        brightness: DEFAULT_IMAGE_STATE.brightness,
                                        contrast: DEFAULT_IMAGE_STATE.contrast,
                                        saturation: DEFAULT_IMAGE_STATE.saturation,
                                        ambiance: DEFAULT_IMAGE_STATE.ambiance,
                                        warmth: DEFAULT_IMAGE_STATE.warmth,
                                        tint: DEFAULT_IMAGE_STATE.tint,
                                        highlights: DEFAULT_IMAGE_STATE.highlights,
                                        shadows: DEFAULT_IMAGE_STATE.shadows,
                                        structure: DEFAULT_IMAGE_STATE.structure,
                                        tonalContrast: DEFAULT_IMAGE_STATE.tonalContrast,
                                        tonalHighTones: DEFAULT_IMAGE_STATE.tonalHighTones,
                                        tonalMidTones: DEFAULT_IMAGE_STATE.tonalMidTones,
                                        tonalLowTones: DEFAULT_IMAGE_STATE.tonalLowTones,
                                        tonalProtectShadows: DEFAULT_IMAGE_STATE.tonalProtectShadows,
                                        tonalProtectHighlights: DEFAULT_IMAGE_STATE.tonalProtectHighlights,
                                        sharpening: DEFAULT_IMAGE_STATE.sharpening,
                                        dehaze: DEFAULT_IMAGE_STATE.dehaze,
                                        grain: DEFAULT_IMAGE_STATE.grain,
                                        vignette: DEFAULT_IMAGE_STATE.vignette,
                                        colorGrade: { ...DEFAULT_IMAGE_STATE.colorGrade },
                                        curves: { 
                                          rgb: [...DEFAULT_IMAGE_STATE.curves.rgb],
                                          r: [...DEFAULT_IMAGE_STATE.curves.r],
                                          g: [...DEFAULT_IMAGE_STATE.curves.g],
                                          b: [...DEFAULT_IMAGE_STATE.curves.b]
                                        },
                                        hdrScape: { ...DEFAULT_IMAGE_STATE.hdrScape },
                                        grainyFilm: { ...DEFAULT_IMAGE_STATE.grainyFilm },
                                      }));
                                      setAppliedLookId(null);
                                      showToast("Reverted look adjustments", "info");
                                    }}
                                    className="text-[9px] text-red-500 hover:text-red-400 font-extrabold uppercase bg-red-950/20 px-2 py-1 rounded border border-red-900/30 transition-all cursor-pointer"
                                >
                                    REVERT
                                </button>
                            )}
                        </div>

                        <div className="space-y-5 max-h-[calc(100vh-270px)] overflow-y-auto custom-scrollbar pr-1 pb-4">
                            {/* Film Simulations Section */}
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5 px-0.5 sticky top-0 bg-[#050505] py-1 z-10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    Film Simulations (New)
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {LOOKS_PRESETS.filter(p => p.id.startsWith('lkp') || p.id.startsWith('lfp') || p.id.startsWith('lfs')).map((preset) => {
                                        const isSelected = appliedLookId === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                onClick={() => applyLook(preset.adjustments, preset.id)}
                                                className={`group relative flex flex-col items-stretch text-left rounded-lg overflow-hidden border p-2 transition-all duration-250 cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-sky-500/10 border-sky-500/50 shadow-[0_4px_16px_rgba(14,165,233,0.15)] shadow-sky-500/10' 
                                                        : 'bg-neutral-900/40 border-neutral-850 hover:bg-neutral-850/80 hover:border-neutral-700'
                                                }`}
                                            >
                                                <div className="flex gap-2 items-center">
                                                    <div className={`w-8 h-8 rounded shrink-0 bg-gradient-to-tr ${preset.gradient} shadow-md group-hover:scale-105 transition-transform duration-300`} />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-[10px] font-extrabold uppercase tracking-wide truncate ${isSelected ? 'text-sky-400' : 'text-neutral-200'}`}>
                                                                {preset.name}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block font-sans animate-pulse" />
                                                            )}
                                                        </div>
                                                        <div className="text-[8px] text-neutral-400 leading-normal line-clamp-2 mt-0.5" title={preset.description}>
                                                            {preset.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Classic Looks Section */}
                            <div className="pt-1 border-t border-neutral-900">
                                <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5 px-0.5 sticky top-0 bg-[#050505] py-1 z-10">
                                    Classic Looks
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {LOOKS_PRESETS.filter(p => !p.id.startsWith('lkp') && !p.id.startsWith('lfp') && !p.id.startsWith('lfs')).map((preset) => {
                                        const isSelected = appliedLookId === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                onClick={() => applyLook(preset.adjustments, preset.id)}
                                                className={`group relative flex flex-col items-stretch text-left rounded-lg overflow-hidden border p-2 transition-all duration-250 cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-sky-500/10 border-sky-500/50 shadow-[0_4px_16px_rgba(14,165,233,0.15)] shadow-sky-500/10' 
                                                        : 'bg-neutral-900/40 border-neutral-850 hover:bg-neutral-850/80 hover:border-neutral-700'
                                                }`}
                                            >
                                                <div className="flex gap-2 items-center">
                                                    <div className={`w-8 h-8 rounded shrink-0 bg-gradient-to-tr ${preset.gradient} shadow-md group-hover:scale-105 transition-transform duration-300`} />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-[10px] font-extrabold uppercase tracking-wide truncate ${isSelected ? 'text-sky-400' : 'text-neutral-200'}`}>
                                                                {preset.name}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block font-sans animate-pulse" />
                                                            )}
                                                        </div>
                                                        <div className="text-[8px] text-neutral-400 leading-normal line-clamp-2 mt-0.5" title={preset.description}>
                                                            {preset.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activePanelTab === 'tune' && (
                    <>
                        {/* CAMERA RAW DEVELOPER SECTION */}
                        <SidebarSection title="RAW Options" defaultOpen={isRaw}>
                    {isRaw ? (
                        <div className="space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2.5 text-center">
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-widest leading-none">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    12-Bit Camera Sensor Active
                                </span>
                                <p className="text-[9px] text-neutral-400 mt-1 leading-relaxed">
                                    Adjusting non-destructive Bayer filter metadata values directly on sensor matrix.
                                </p>
                            </div>

                            {/* Camera Profile */}
                            <div className="py-2 space-y-3">
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block mb-1.5 flex justify-between items-center">
                                        <span>Creative Profile</span>
                                        {['Standard', 'Vivid', 'Landscape', 'Portrait', 'Monochrome'].includes(imageState.rawProfile) && (
                                            <span className="text-amber-500 font-mono tracking-normal uppercase bg-amber-500/10 px-1 py-0.5 rounded text-[8px]">{imageState.rawProfile}</span>
                                        )}
                                    </label>
                                    <div className="grid grid-cols-5 gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded">
                                        {(['Standard', 'Vivid', 'Landscape', 'Portrait', 'Monochrome'] as const).map(prof => (
                                            <button 
                                                key={prof}
                                                onClick={() => updateState('rawProfile', prof)}
                                                className={`py-1 text-[8px] font-bold uppercase rounded border transition-all ${
                                                    imageState.rawProfile === prof 
                                                        ? 'bg-amber-500 border-amber-500 text-black' 
                                                        : 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-neutral-80/50 cursor-pointer'
                                                }`}
                                                title={`${prof} Camera rendering profile`}
                                            >
                                                {prof.slice(0, 4)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block mb-1.5 flex justify-between items-center">
                                        <span>White Balance Profile</span>
                                        {['Sunny', 'Cloudy', 'Shade', 'Tungsten', 'Fluorescent', 'Flash'].includes(imageState.rawProfile) && (
                                            <span className="text-amber-500 font-mono tracking-normal uppercase bg-amber-500/10 px-1 py-0.5 rounded text-[8px]">{imageState.rawProfile}</span>
                                        )}
                                    </label>
                                    <div className="grid grid-cols-3 gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded">
                                        {(['Sunny', 'Cloudy', 'Shade', 'Tungsten', 'Fluorescent', 'Flash'] as const).map(prof => (
                                            <button 
                                                key={prof}
                                                onClick={() => updateState('rawProfile', prof)}
                                                className={`py-1.5 text-[8.5px] font-bold uppercase rounded border transition-all ${
                                                    imageState.rawProfile === prof 
                                                        ? 'bg-amber-500 border-amber-500 text-black' 
                                                        : 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-neutral-800/50 cursor-pointer'
                                                }`}
                                                title={`${prof} White Balance profile`}
                                            >
                                                {prof}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Exposure Baseline EV */}
                            <Slider 
                                label="Exposure Baseline (EV)" 
                                min={-3} 
                                max={3} 
                                step={0.05} 
                                value={imageState.rawExposureEV} 
                                onChange={(v) => updateState('rawExposureEV', v)} 
                                onReset={() => updateState('rawExposureEV', 0)} 
                            />

                            {/* Sensor White Balance Temp */}
                            <Slider 
                                label="Sensor Temperature" 
                                min={-100} 
                                max={100} 
                                step={1} 
                                value={imageState.rawTemperature} 
                                onChange={(v) => updateState('rawTemperature', v)}  
                                onReset={() => updateState('rawTemperature', 0)} 
                            />

                            {/* Sensor Tint */}
                            <Slider 
                                label="Sensor Tint" 
                                min={-100} 
                                max={100} 
                                step={1} 
                                value={imageState.rawTint} 
                                onChange={(v) => updateState('rawTint', v)} 
                                onReset={() => updateState('rawTint', 0)} 
                            />

                            {/* Sensor Highlights Recovery */}
                            <Slider 
                                label="Highlights Recovery" 
                                min={-100} 
                                max={100} 
                                step={1} 
                                value={imageState.rawHighlights} 
                                onChange={(v) => updateState('rawHighlights', v)} 
                                onReset={() => updateState('rawHighlights', 0)} 
                            />

                            {/* Sensor Shadows Recovery */}
                            <Slider 
                                label="Shadow Detail Lift" 
                                min={-100} 
                                max={100} 
                                step={1} 
                                value={imageState.rawShadows} 
                                onChange={(v) => updateState('rawShadows', v)} 
                                onReset={() => updateState('rawShadows', 0)} 
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center border border-dashed border-neutral-850 rounded bg-black/20 my-2">
                            <span className="text-sm mb-1.5 opacity-80">📷</span>
                            <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">RAW Developer Locked</span>
                            <p className="text-[9px] text-neutral-500 mt-1.5 leading-relaxed max-w-[220px]">
                                Camera RAW developer adjusts native 12-bit sensor data. Load a RAW format (such as .dng, .cr2, .nef, .arw) to unlock non-destructive Bayer development controls.
                            </p>
                        </div>
                    )}
                </SidebarSection>
            </>
        )}
                
        {activePanelTab === 'local' && (
            <>
                        {/* Snapseed Selective Control Points */}
                        <SidebarSection title="Selective Grid Points" defaultOpen={true}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-neutral-905 p-2 rounded border border-neutral-900">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 font-mono">
                                        Selective Node Tool
                                    </span>
                                    <button
                                        onClick={() => {
                                            setIsAddingSelective(!isAddingSelective);
                                            if (!isAddingSelective) {
                                                setIsHealingBrushActive(false);
                                            }
                                        }}
                                        className={`px-2.5 py-1 text-[9px] font-black uppercase rounded transition-colors cursor-pointer ${
                                            isAddingSelective ? 'bg-sky-500 text-white font-extrabold animate-pulse' : 'bg-neutral-900 text-neutral-400 hover:text-white font-semibold'
                                        }`}
                                    >
                                        {isAddingSelective ? 'TAP PHOTO' : 'ADD POINT'}
                                    </button>
                                </div>

                                {imageState.selectivePoints && imageState.selectivePoints.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="max-h-24 overflow-y-auto border border-neutral-900 rounded bg-neutral-950/20 p-2 custom-scrollbar flex flex-wrap gap-1.5">
                                            {imageState.selectivePoints.map((pt, idx) => {
                                                const isFocused = pt.id === focusedSelectiveId;
                                                return (
                                                    <div
                                                        key={pt.id}
                                                        onClick={() => setFocusedSelectiveId(pt.id)}
                                                        className={`px-2.5 py-1 rounded text-[9px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 border ${
                                                            isFocused ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 font-semibold' : 'bg-neutral-900 text-neutral-400 border-transparent'
                                                        }`}
                                                    >
                                                        <span>Point {idx + 1}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setImageState(prev => ({
                                                                    ...prev,
                                                                    selectivePoints: (prev.selectivePoints || []).filter(p => p.id !== pt.id)
                                                                }));
                                                                if (focusedSelectiveId === pt.id) setFocusedSelectiveId(null);
                                                            }}
                                                            className="hover:text-red-500 transition-colors cursor-pointer font-bold inline-block ml-0.5"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {focusedSelectiveId && (
                                            <div className="bg-neutral-950/40 border border-neutral-900 p-3 rounded space-y-3.5">
                                                <div className="text-[9px] font-extrabold uppercase tracking-widest text-sky-400 mb-1">
                                                    Adjusting Selected Node
                                                </div>
                                                {(() => {
                                                    const pt = (imageState.selectivePoints || []).find(p => p.id === focusedSelectiveId);
                                                    if (!pt) return null;
                                                    return (
                                                        <>
                                                            <Slider
                                                                label="Control Radius"
                                                                min={5}
                                                                max={100}
                                                                suffix="%"
                                                                value={pt.radius}
                                                                onChange={(val) => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, radius: val } : p
                                                                        )
                                                                    }));
                                                                }}
                                                                onReset={() => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, radius: 20 } : p
                                                                        )
                                                                    }));
                                                                }}
                                                            />
                                                            <Slider
                                                                label="Brightness (B)"
                                                                min={-100}
                                                                max={100}
                                                                value={pt.brightness}
                                                                onChange={(val) => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, brightness: val } : p
                                                                        )
                                                                    }));
                                                                }}
                                                                onReset={() => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, brightness: 0 } : p
                                                                        )
                                                                    }));
                                                                }}
                                                            />
                                                            <Slider
                                                                label="Contrast (C)"
                                                                min={-100}
                                                                max={100}
                                                                value={pt.contrast}
                                                                onChange={(val) => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, contrast: val } : p
                                                                        )
                                                                    }));
                                                                }}
                                                                onReset={() => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, contrast: 0 } : p
                                                                        )
                                                                    }));
                                                                }}
                                                            />
                                                            <Slider
                                                                label="Saturation (S)"
                                                                min={-100}
                                                                max={100}
                                                                value={pt.saturation}
                                                                onChange={(val) => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, saturation: val } : p
                                                                        )
                                                                    }));
                                                                }}
                                                                onReset={() => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, saturation: 0 } : p
                                                                        )
                                                                    }));
                                                                }}
                                                            />
                                                            <Slider
                                                                label="Structure (St)"
                                                                min={-100}
                                                                max={100}
                                                                value={pt.structure}
                                                                onChange={(val) => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, structure: val } : p
                                                                        )
                                                                    }));
                                                                }}
                                                                onReset={() => {
                                                                    setImageState(prev => ({
                                                                        ...prev,
                                                                        selectivePoints: (prev.selectivePoints || []).map(p => 
                                                                            p.id === focusedSelectiveId ? { ...p, structure: 0 } : p
                                                                        )
                                                                    }));
                                                                }}
                                                            />
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-neutral-500 text-center leading-relaxed py-1">
                                        Click point placement then tap the workspace image to fine-tune local colors.
                                    </div>
                                )}
                            </div>
                        </SidebarSection>

                        {/* Snapseed Healing Brush */}
                        <SidebarSection title="Blemish Healing Stamp" defaultOpen={true}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-neutral-905 p-2 rounded border border-neutral-900">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 font-mono">
                                        Spot Healing Brush
                                    </span>
                                    <button
                                        onClick={() => {
                                            setIsHealingBrushActive(!isHealingBrushActive);
                                            if (!isHealingBrushActive) {
                                                setIsAddingSelective(false);
                                                setActiveMaskId(null); 
                                            }
                                        }}
                                        className={`px-2.5 py-1 text-[9px] font-black uppercase rounded cursor-pointer transition-colors ${
                                            isHealingBrushActive ? 'bg-sky-500 text-white font-extrabold' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                                        }`}
                                    >
                                        {isHealingBrushActive ? 'ON' : 'OFF'}
                                    </button>
                                </div>

                                {isHealingBrushActive && (
                                    <div className="space-y-3.5 mt-1 bg-neutral-950/20 border border-neutral-900 p-3 rounded">
                                        <Slider
                                            label="Healing Stamp Diameter"
                                            min={5}
                                            max={85}
                                            value={healingBrushSize}
                                            onChange={(val) => setHealingBrushSize(val)}
                                        />
                                        <div className="text-[9px] text-neutral-400 leading-relaxed text-center py-1 bg-black/45 border border-neutral-900 rounded select-none">
                                            Paint blemishes or dust flecks over to remove them.
                                        </div>
                                    </div>
                                )}

                                {imageState.healingStrokes && imageState.healingStrokes.length > 0 && (
                                    <div className="flex justify-between items-center bg-sky-950/10 border border-sky-500/20 px-3 py-1.5 rounded">
                                        <span className="text-[9px] font-bold text-sky-400">
                                            {imageState.healingStrokes.length} Spots Healed
                                        </span>
                                        <button
                                            onClick={() => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    healingStrokes: (prev.healingStrokes || []).slice(0, -1)
                                                }));
                                            }}
                                            className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                            title="Undo most recent spot correction"
                                        >
                                            Undo Spot
                                        </button>
                                    </div>
                                )}
                            </div>
                        </SidebarSection>

                        {/* SELECTIVE EDITING SECTION */}
                        <SidebarSection title="Selective Edits (Masks)" defaultOpen={!!activeMaskId}>
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={addMask}
                                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                                        onClick={() => {
                                            setActiveMaskId(mask.id);
                                            setIsHealingBrushActive(false);
                                            setIsAddingSelective(false);
                                        }}
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
                                                className={`w-4 h-4 cursor-pointer hover:scale-105 transition-transform ${mask.isVisible ? 'text-white' : 'text-neutral-600'}`}
                                            >
                                                {mask.isVisible ? Icons.Eye : Icons.EyeOff}
                                            </button>
                                            <input 
                                                type="text" 
                                                value={mask.name}
                                                onChange={(e) => updateMaskName(mask.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-neutral-600 focus:border-blue-500 focus:outline-none w-24 py-0"
                                            />
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeMask(mask.id); }}
                                            className="text-neutral-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                                            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-colors ${!isErasing ? 'bg-blue-600 text-white font-extrabold' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                                        >
                                            Paint
                                        </button>
                                        <button 
                                            onClick={() => setIsErasing(true)}
                                            className={`flex-1 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-colors ${isErasing ? 'bg-red-650 text-white font-extrabold' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                                        >
                                            Erase
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-3">
                                         <label className="flex items-center gap-2 text-[10px] uppercase font-bold text-neutral-400 cursor-pointer select-none">
                                             <input 
                                                type="checkbox" 
                                                checked={showMaskOverlay} 
                                                onChange={(e) => setShowMaskOverlay(e.target.checked)}
                                                className="w-3 h-3 bg-neutral-800 border-neutral-600 rounded cursor-pointer"
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
                                        className="w-full mt-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 rounded text-xs font-bold uppercase cursor-pointer"
                                    >
                                        Done / Apply Area
                                    </button>
                                </div>
                            )}
                        </SidebarSection>
                    </>
                )}

                {activePanelTab === 'tune' && (
                    <>
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

                {/* HDR Scape Tool */}
                <SidebarSection title="HDR Scape" defaultOpen={(imageState.hdrScape?.strength || 0) > 0}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
                            {(['Nature', 'People', 'Fine', 'Strong'] as const).map(style => {
                                const isSel = (imageState.hdrScape?.style || 'Nature') === style;
                                return (
                                    <button
                                        key={style}
                                        onClick={() => {
                                            setImageState(prev => ({
                                                ...prev,
                                                hdrScape: {
                                                    ...(prev.hdrScape || { strength: 0, brightness: 0, saturation: 0, style: 'Nature' }),
                                                    style
                                                }
                                            }));
                                        }}
                                        className={`py-1 text-[8px] font-black rounded text-center transition-colors cursor-pointer ${
                                            isSel ? 'bg-sky-500 text-white font-extrabold' : 'text-neutral-400 hover:text-white bg-neutral-950/40'
                                        }`}
                                    >
                                        {style}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="space-y-3">
                            <Slider
                                label="Filter Strength"
                                min={0}
                                max={100}
                                value={imageState.hdrScape?.strength || 0}
                                suffix="%"
                                onChange={(val) => {
                                    setImageState(prev => ({
                                        ...prev,
                                        hdrScape: {
                                            ...(prev.hdrScape || { strength: 0, brightness: 0, saturation: 0, style: 'Nature' }),
                                            strength: val
                                        }
                                    }));
                                }}
                                onReset={() => {
                                    setImageState(prev => ({
                                        ...prev,
                                        hdrScape: {
                                            ...(prev.hdrScape || { strength: 0, brightness: 0, saturation: 0, style: 'Nature' }),
                                            strength: 0
                                        }
                                    }));
                                }}
                            />
                            <Slider
                                label="HDR Brightness"
                                min={-100}
                                max={100}
                                value={imageState.hdrScape?.brightness || 0}
                                onChange={(val) => {
                                    setImageState(prev => ({
                                        ...prev,
                                        hdrScape: {
                                            ...(prev.hdrScape || { strength: 0, brightness: 0, saturation: 0, style: 'Nature' }),
                                            brightness: val
                                        }
                                    }));
                                }}
                                onReset={() => {
                                    setImageState(prev => ({
                                        ...prev,
                                        hdrScape: {
                                            ...(prev.hdrScape || { strength: 0, brightness: 0, saturation: 0, style: 'Nature' }),
                                            brightness: 0
                                        }
                                    }));
                                }}
                            />
                            <Slider
                                label="HDR Saturation"
                                min={-100}
                                max={100}
                                value={imageState.hdrScape?.saturation || 0}
                                onChange={(val) => {
                                    setImageState(prev => ({
                                        ...prev,
                                        hdrScape: {
                                            ...(prev.hdrScape || { strength: 0, brightness: 0, saturation: 0, style: 'Nature' }),
                                            saturation: val
                                        }
                                    }));
                                }}
                                onReset={() => {
                                    setImageState(prev => ({
                                        ...prev,
                                        hdrScape: {
                                            ...(prev.hdrScape || { strength: 0, brightness: 0, saturation: 0, style: 'Nature' }),
                                            saturation: 0
                                        }
                                    }));
                                }}
                            />
                        </div>
                    </div>
                </SidebarSection>
            </>
        )}

                {activePanelTab === 'creative' && (
                    <>
                        {/* Curves Tone Splines */}
                        <CurvesEditor
                            curves={imageState.curves || { rgb: [{x:0,y:0},{x:1,y:1}], r:[{x:0,y:0},{x:1,y:1}], g:[{x:0,y:0},{x:1,y:1}], b:[{x:0,y:0},{x:1,y:1}] }}
                            onChange={(curves) => {
                                setImageState(prev => ({
                                    ...prev,
                                    curves
                                }));
                            }}
                        />

                        {/* Lens Blur Tool */}
                        <SidebarSection title="Lens Blur (Tilt Shift)" defaultOpen={imageState.lensBlur?.enabled}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-neutral-905 p-2 rounded border border-neutral-900">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                                        Depth Field Blur
                                    </span>
                                    <button
                                        onClick={() => {
                                            setImageState(prev => ({
                                                ...prev,
                                                lensBlur: {
                                                    ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                    enabled: !prev.lensBlur?.enabled
                                                }
                                            }));
                                        }}
                                        className={`px-2.5 py-1 text-[9px] font-black uppercase rounded cursor-pointer transition-colors ${
                                            imageState.lensBlur?.enabled ? 'bg-sky-500 text-white font-extrabold' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                                        }`}
                                    >
                                        {imageState.lensBlur?.enabled ? 'ON' : 'OFF'}
                                    </button>
                                </div>

                                {imageState.lensBlur?.enabled && (
                                    <div className="space-y-3 mt-1">
                                        <div className="flex gap-2 items-center justify-between py-1 border-b border-neutral-900">
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Blur Shape</span>
                                            <div className="flex gap-1">
                                                {(['circular', 'linear'] as const).map(shape => {
                                                    const isSel = (imageState.lensBlur?.shape || 'circular') === shape;
                                                    return (
                                                        <button
                                                            key={shape}
                                                            onClick={() => {
                                                                setImageState(prev => ({
                                                                    ...prev,
                                                                    lensBlur: {
                                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                                        shape
                                                                    }
                                                                }));
                                                            }}
                                                            className={`px-2 py-0.5 text-[8.5px] font-extrabold uppercase rounded transition-colors cursor-pointer ${
                                                                isSel ? 'bg-sky-500 text-white' : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
                                                            }`}
                                                        >
                                                            {shape === 'circular' ? 'Radial' : 'Linear'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <Slider
                                            label="Blur Strength"
                                            min={0}
                                            max={100}
                                            value={imageState.lensBlur?.blurRadius || 0}
                                            onChange={(val) => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        blurRadius: val
                                                    }
                                                }));
                                            }}
                                            onReset={() => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        blurRadius: 0
                                                    }
                                                }));
                                            }}
                                        />

                                        <Slider
                                            label="Inner Mask Size"
                                            min={0}
                                            max={100}
                                            value={imageState.lensBlur?.innerRadius || 0}
                                            onChange={(val) => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        innerRadius: val
                                                    }
                                                }));
                                            }}
                                            onReset={() => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        innerRadius: 15
                                                    }
                                                }));
                                            }}
                                        />

                                        <Slider
                                            label="Transition Size"
                                            min={5}
                                            max={100}
                                            value={imageState.lensBlur?.transitionSize || 0}
                                            onChange={(val) => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        transitionSize: val
                                                    }
                                                }));
                                            }}
                                            onReset={() => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        transitionSize: 20
                                                    }
                                                }));
                                            }}
                                        />

                                        {imageState.lensBlur?.shape === 'linear' && (
                                            <Slider
                                                label="Tilt Angle"
                                                min={0}
                                                max={360}
                                                value={imageState.lensBlur?.angle || 0}
                                                suffix="°"
                                                onChange={(val) => {
                                                    setImageState(prev => ({
                                                        ...prev,
                                                        lensBlur: {
                                                            ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                            angle: val
                                                        }
                                                    }));
                                                }}
                                                onReset={() => {
                                                    setImageState(prev => ({
                                                        ...prev,
                                                        lensBlur: {
                                                            ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                            angle: 0
                                                        }
                                                    }));
                                                }}
                                            />
                                        )}

                                        <Slider
                                            label="Lens Vignette"
                                            min={0}
                                            max={100}
                                            value={imageState.lensBlur?.vignette || 0}
                                            onChange={(val) => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        vignette: val
                                                    }
                                                }));
                                            }}
                                            onReset={() => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    lensBlur: {
                                                        ...(prev.lensBlur || { enabled: false, x: 50, y: 50, blurRadius: 30, transitionSize: 20, innerRadius: 15, vignette: 10, shape: 'circular', angle: 0 }),
                                                        vignette: 10
                                                    }
                                                }));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </SidebarSection>

                        {/* Grainy Film Styles */}
                        <SidebarSection title="Grainy Film Style" defaultOpen={(imageState.grainyFilm?.strength || 0) > 0}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-5 gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded">
                                    {[
                                        { id: 'off', label: 'OFF' },
                                        { id: 'X01', label: 'X01' },
                                        { id: 'X02', label: 'X02' },
                                        { id: 'L01', label: 'L01' },
                                        { id: 'L02', label: 'L02' },
                                        { id: 'F01', label: 'F01' },
                                        { id: 'F02', label: 'F02' },
                                        { id: 'K01', label: 'K01' },
                                        { id: 'K02', label: 'K02' },
                                    ].map(style => {
                                        const isSel = (imageState.grainyFilm?.style || 'off') === style.id;
                                        return (
                                            <button
                                                key={style.id}
                                                onClick={() => {
                                                    setImageState(prev => ({
                                                        ...prev,
                                                        grainyFilm: {
                                                            ...(prev.grainyFilm || { strength: 0, grain: 0, style: 'off' }),
                                                            style: style.id
                                                        }
                                                    }));
                                                }}
                                                className={`py-1 text-[8.5px] font-black rounded text-center transition-colors cursor-pointer ${
                                                    isSel ? 'bg-sky-500 text-white font-extrabold' : 'text-neutral-400 hover:text-white bg-neutral-950/40'
                                                }`}
                                            >
                                                {style.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {imageState.grainyFilm?.style !== 'off' && (
                                    <div className="space-y-3 mt-1.5">
                                        <Slider
                                            label="Style Strength"
                                            min={0}
                                            max={100}
                                            suffix="%"
                                            value={imageState.grainyFilm?.strength || 0}
                                            onChange={(val) => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    grainyFilm: {
                                                        ...(prev.grainyFilm || { strength: 0, grain: 0, style: 'off' }),
                                                        strength: val
                                                    }
                                                }));
                                            }}
                                            onReset={() => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    grainyFilm: {
                                                        ...(prev.grainyFilm || { strength: 0, grain: 0, style: 'off' }),
                                                        strength: 0
                                                    }
                                                }));
                                            }}
                                        />
                                        <Slider
                                            label="Filmic Grain"
                                            min={0}
                                            max={100}
                                            suffix="%"
                                            value={imageState.grainyFilm?.grain || 0}
                                            onChange={(val) => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    grainyFilm: {
                                                        ...(prev.grainyFilm || { strength: 0, grain: 0, style: 'off' }),
                                                        grain: val
                                                    }
                                                }));
                                            }}
                                            onReset={() => {
                                                setImageState(prev => ({
                                                    ...prev,
                                                    grainyFilm: {
                                                        ...(prev.grainyFilm || { strength: 0, grain: 0, style: 'off' }),
                                                        grain: 0
                                                    }
                                                }));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </SidebarSection>

                        <SidebarSection title="Global: Tonal Contrast (Advanced)">
                            <Slider label="High Tones" min={-100} max={100} value={imageState.tonalHighTones} onChange={(v) => updateState('tonalHighTones', v)} onReset={() => updateState('tonalHighTones', 0)} />
                            <Slider label="Mid Tones" min={-100} max={100} value={imageState.tonalMidTones} onChange={(v) => updateState('tonalMidTones', v)} onReset={() => updateState('tonalMidTones', 0)} />
                            <Slider label="Low Tones" min={-100} max={100} value={imageState.tonalLowTones} onChange={(v) => updateState('tonalLowTones', v)} onReset={() => updateState('tonalLowTones', 0)} />
                            <div className="h-px bg-neutral-900 my-2"></div>
                            <Slider label="Protect Shadows" min={0} max={100} value={imageState.tonalProtectShadows} onChange={(v) => updateState('tonalProtectShadows', v)} onReset={() => updateState('tonalProtectShadows', 0)} />
                            <Slider label="Protect Highlights" min={0} max={100} value={imageState.tonalProtectHighlights} onChange={(v) => updateState('tonalProtectHighlights', v)} onReset={() => updateState('tonalProtectHighlights', 0)} />
                        </SidebarSection>

                        <SidebarSection title="Global: Details & Effects">
                            <Slider label="Structure" min={0} max={100} value={imageState.structure} onChange={(v) => updateState('structure', v)} onReset={() => updateState('structure', 0)} />
                            <Slider label="Sharpening" min={0} max={100} value={imageState.sharpening} onChange={(v) => updateState('sharpening', v)} onReset={() => updateState('sharpening', 0)} />
                            <Slider label="Dehaze" min={0} max={100} value={imageState.dehaze} onChange={(v) => updateState('dehaze', v)} onReset={() => updateState('dehaze', 0)} />
                            <div className="h-px bg-neutral-900 my-2"></div>
                            <Slider label="Grain" min={0} max={100} value={imageState.grain} onChange={(v) => updateState('grain', v)} onReset={() => updateState('grain', 0)} />
                            <Slider label="Vignette" min={0} max={100} value={imageState.vignette} onChange={(v) => updateState('vignette', v)} onReset={() => updateState('vignette', 0)} />
                        </SidebarSection>
                    </>
                )}

                {activePanelTab === 'geometry' && (
                    <>
                        <SidebarSection title="Geometry Alignments" defaultOpen={true}>
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
                                            className={`p-1.5 rounded border transition-all cursor-pointer ${isStraightenToolActive ? 'bg-blue-600 border-blue-605 text-white' : 'border-neutral-700 text-neutral-400 hover:text-white'}`}
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
                                        className="w-3 h-3 rounded bg-neutral-800 border-neutral-600 checked:bg-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <label htmlFor="constrain-crop" className="ml-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 cursor-pointer select-none">
                                        Constrain to Image (Auto Crop)
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <button 
                                    onClick={() => updateState('rotation', (imageState.rotation - 90 + 360) % 360)}
                                    className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-colors border border-transparent cursor-pointer"
                                    title="Rotate Left (90° CCW)"
                                >
                                     <RotateCcw className="w-4 h-4" />
                                     <span className="text-[9px] uppercase tracking-wider font-semibold">CCW</span>
                                </button>
                                <button 
                                    onClick={() => updateState('rotation', (imageState.rotation + 90) % 360)}
                                    className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-colors border border-transparent cursor-pointer"
                                    title="Rotate Right (90° CW)"
                                >
                                     <RotateCw className="w-4 h-4" />
                                     <span className="text-[9px] uppercase tracking-wider font-semibold">CW</span>
                                </button>
                                <button 
                                    onClick={() => updateState('flipH', !imageState.flipH)}
                                    className={`py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-all border cursor-pointer
                                        ${imageState.flipH ? 'bg-blue-600 border-blue-500 text-white font-extrabold' : 'bg-neutral-900 text-neutral-400 hover:text-white border-transparent hover:bg-neutral-800'}
                                    `}
                                    title="Flip Horizontally (Left-Right Mirror)"
                                >
                                     <FlipHorizontal className="w-4 h-4" />
                                     <span className="text-[9px] uppercase tracking-wider font-semibold">Flip H</span>
                                </button>
                                <button 
                                    onClick={() => updateState('flipV', !imageState.flipV)}
                                    className={`py-3 rounded flex flex-col items-center justify-center gap-1.5 transition-all border cursor-pointer
                                        ${imageState.flipV ? 'bg-blue-600 border-blue-500 text-white font-extrabold' : 'bg-neutral-900 text-neutral-400 hover:text-white border-transparent hover:bg-neutral-800'}
                                    `}
                                    title="Flip Vertically (Up-Down Mirror)"
                                >
                                     <FlipVertical className="w-4 h-4" />
                                     <span className="text-[9px] uppercase tracking-wider font-semibold">Flip V</span>
                                </button>
                            </div>
                        </SidebarSection>

                        {/* Aspect Cropper Selection button */}
                        <div className="p-5 border-t border-neutral-900/50 bg-neutral-950/20">
                            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-2">Manual Crop Geometry</span>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setIsCropMode(true)}
                                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-extrabold uppercase py-3 rounded-lg text-xs tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                    id="btn-adjust-crop"
                                >
                                    <div className="w-4 h-4">{Icons.Crop}</div>
                                    <span>Adjust Crop Overlay</span>
                                </button>
                                {imageState.crop && (
                                    <button
                                        onClick={() => updateState('crop', null)}
                                        className="w-full bg-neutral-900 hover:bg-neutral-800 text-rose-500 hover:text-rose-400 py-2.5 rounded text-[10px] font-extrabold uppercase tracking-widest transition-colors border border-neutral-800 cursor-pointer"
                                        id="btn-remove-crop"
                                    >
                                        Remove Cropping (Full Image)
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

            </div>
        </aside>

      </div>

      {/* Floating Exporting/Download Loader & Export Settings Modal */}
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

        {showExportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden z-10 shadow-2xl text-left"
            >
              <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 shrink-0">
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white">Export Options</h3>
                </div>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-5 space-y-6">
                {/* Format selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">
                    File Format
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-black p-1 rounded-lg border border-neutral-850">
                    <button 
                      type="button"
                      onClick={() => setExportFormat('jpeg')}
                      className={`py-2 text-[11px] font-bold uppercase rounded-md transition-all ${
                        exportFormat === 'jpeg'
                          ? 'bg-neutral-850 text-white shadow-sm'
                          : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-950/20 cursor-pointer'
                      }`}
                    >
                      JPEG (Standard)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setExportFormat('png')}
                      className={`py-2 text-[11px] font-bold uppercase rounded-md transition-all ${
                        exportFormat === 'png'
                          ? 'bg-neutral-850 text-white shadow-sm'
                          : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-950/20 cursor-pointer'
                      }`}
                    >
                      PNG (Lossless)
                    </button>
                  </div>
                </div>

                {/* Quality selection (only for JPG) */}
                {exportFormat === 'jpeg' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      <span>Compression Quality</span>
                      <span className="font-mono text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {Math.round(exportQuality * 100)}%
                      </span>
                    </div>
                    
                    <div className="space-y-2.5">
                      <input 
                        type="range"
                        min="0.10"
                        max="1.00"
                        step="0.05"
                        value={exportQuality}
                        onChange={(e) => setExportQuality(parseFloat(e.target.value))}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-white"
                      />
                      
                      {/* Detailed guidance dynamically displayed */}
                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 text-[10px] text-neutral-450 leading-relaxed">
                        {exportQuality >= 0.91 ? (
                          <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Ultra High Resolution (Large file size)</span>
                          </div>
                        ) : exportQuality >= 0.76 ? (
                          <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Optimized Web High (Excellent balance)</span>
                          </div>
                        ) : exportQuality >= 0.51 ? (
                          <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            <span>Standard / High Compression (Web friendly)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>Draft Quality (Very high compression)</span>
                          </div>
                        )}
                        <p className="mt-1.5 text-neutral-500 text-[9px] leading-relaxed">
                          JPEG compression optimizes photographs by gently discarding imperceptible color differences. Recommended for sharing.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 text-[9.5px] leading-relaxed space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Lossless PNG Active</span>
                    </div>
                    <p className="text-neutral-400 text-[10px]">
                      PNG ensures mathematically perfect reproduction of edited pixels containing zero artifacts.
                    </p>
                    <p className="text-neutral-500 text-[9px]">
                      Ideal for editing text, layouts, high contrast vector lines, or maintaining transparency. Resulting file sizes are typically larger.
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="p-5 border-t border-neutral-800 bg-black/10 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-800 text-[11px] font-bold uppercase text-neutral-400 hover:text-white hover:bg-neutral-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(exportFormat, exportQuality)}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Download
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCloseConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCloseConfirm(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden z-10 shadow-2xl text-left"
            >
              <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white">Unsaved Changes</h3>
                </div>
                <button 
                  onClick={() => setShowCloseConfirm(false)}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-5 space-y-2">
                <p className="text-[12px] sm:text-[13px] text-neutral-300 leading-relaxed">
                  Are you sure you want to close this image and return to the homepage?
                </p>
                <p className="text-[10px] text-neutral-550 leading-relaxed font-medium">
                  All interactive adjustments, crops, and live masking effects will be lost. This action is irreversible.
                </p>
              </div>

              {/* Action buttons footer */}
              <div className="p-5 border-t border-neutral-800 bg-black/10 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-800 text-[11px] font-bold uppercase text-neutral-400 hover:text-white hover:bg-neutral-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirm(false);
                    setSourceImage(null);
                    setImageState(DEFAULT_IMAGE_STATE);
                    setActiveMaskId(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close Image
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: "-50%" }}
            transition={{ duration: 0.15 }}
            className={`fixed bottom-8 left-1/2 z-[130] flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-neutral-900/95 backdrop-blur border-neutral-800 text-white min-w-[240px] justify-center text-center`}
          >
            {toast.type === 'success' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;
