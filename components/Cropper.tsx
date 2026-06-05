import React, { useState, useRef, useEffect } from 'react';

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface CropperProps {
    image: HTMLImageElement;
    initialCrop: Rect | null;
    onComplete: (crop: Rect | null) => void;
    onCancel: () => void;
}

const Cropper: React.FC<CropperProps> = ({ image, initialCrop, onComplete, onCancel }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [imgRect, setImgRect] = useState<Rect | null>(null);
    const [safeSrc, setSafeSrc] = useState<string>('');
    const [isGeneratingSafeSrc, setIsGeneratingSafeSrc] = useState(true);
    
    // Store crop in normalized coordinates relative to natural image dimensions (from 0.0 to 1.0)
    const [normalizedRect, setNormalizedRect] = useState({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    const [dragging, setDragging] = useState<'nw' | 'ne' | 'sw' | 'se' | 'move' | null>(null);
    const dragStart = useRef<{x: number, y: number} | null>(null);
    const rectStart = useRef<Rect | null>(null);

    // 1. Generate standard fully compliant local dataURL representation of loaded image to bypass revoked/sandbox sources
    useEffect(() => {
        try {
            setIsGeneratingSafeSrc(true);
            const canvas = document.createElement('canvas');
            const maxDim = 1200; // Optimal preview density, fast and smooth
            const iW = image.naturalWidth || image.width || 800;
            const iH = image.naturalHeight || image.height || 600;
            
            let dW = iW;
            let dH = iH;
            if (iW > maxDim || iH > maxDim) {
                if (iW > iH) {
                    dW = maxDim;
                    dH = Math.round((iH * maxDim) / iW);
                } else {
                    dH = maxDim;
                    dW = Math.round((iW * maxDim) / iH);
                }
            }
            
            canvas.width = dW;
            canvas.height = dH;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0, dW, dH);
                const localUrl = canvas.toDataURL('image/png');
                setSafeSrc(localUrl);
            } else {
                setSafeSrc(image.src);
            }
        } catch (err) {
            console.warn("Failed to generate safe local canvas crop source, falling back to original src", err);
            setSafeSrc(image.src);
        } finally {
            setIsGeneratingSafeSrc(false);
        }
    }, [image]);

    // 2. Initialize normalized coordinates based on initial crop parameter (if present)
    useEffect(() => {
        const iW = image.naturalWidth || 800;
        const iH = image.naturalHeight || 600;
        
        if (initialCrop && initialCrop.width > 2 && initialCrop.height > 2) {
            setNormalizedRect({
                x: Math.max(0, Math.min(1, initialCrop.x / iW)),
                y: Math.max(0, Math.min(1, initialCrop.y / iH)),
                w: Math.max(0.01, Math.min(1, initialCrop.width / iW)),
                h: Math.max(0.01, Math.min(1, initialCrop.height / iH))
            });
        } else {
            // Default: slightly inset full crop
            setNormalizedRect({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
        }
    }, [image, initialCrop]);

    // 3. Set up ResizeObserver to track container bounds dynamically & compute scaled image display rectangle
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateBounds = () => {
            const containerW = container.clientWidth;
            const containerH = container.clientHeight;
            if (containerW <= 0 || containerH <= 0) return;

            const iW = image.naturalWidth || 800;
            const iH = image.naturalHeight || 600;

            const MathRatio = Math.min(containerW / iW, containerH / iH);
            const displayW = iW * MathRatio;
            const displayH = iH * MathRatio;
            const offsetX = (containerW - displayW) / 2;
            const offsetY = (containerH - displayH) / 2;

            setImgRect({
                x: offsetX,
                y: offsetY,
                width: displayW,
                height: displayH
            });
        };

        // Call immediately on mount/update
        updateBounds();

        // Observe container size transformations natively
        const observer = new ResizeObserver(() => {
            updateBounds();
        });
        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, [image]);

    // Derived Display Coordinates
    const rect: Rect | null = imgRect ? {
        x: imgRect.x + normalizedRect.x * imgRect.width,
        y: imgRect.y + normalizedRect.y * imgRect.height,
        width: normalizedRect.w * imgRect.width,
        height: normalizedRect.h * imgRect.height
    } : null;

    const handleMouseDown = (e: React.MouseEvent, type: 'nw' | 'ne' | 'sw' | 'se' | 'move') => {
        e.stopPropagation();
        e.preventDefault();
        setDragging(type);
        dragStart.current = { x: e.clientX, y: e.clientY };
        if (rect) {
            rectStart.current = { ...rect };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !dragStart.current || !rectStart.current || !imgRect) return;

        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const s = rectStart.current;
        const bounds = imgRect;

        const newRect = { ...s };

        if (dragging === 'move') {
            newRect.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width - s.width, s.x + dx));
            newRect.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height - s.height, s.y + dy));
        } else {
            // Corner handles with a minimum size of 45px
            const minSize = 45;
            if (dragging.includes('w')) {
                const maxW = s.x + s.width - bounds.x;
                const requestedW = s.width - dx;
                const finalW = Math.max(minSize, Math.min(maxW, requestedW));
                newRect.x = s.x + s.width - finalW;
                newRect.width = finalW;
            }
            if (dragging.includes('e')) {
                const maxW = bounds.x + bounds.width - s.x;
                newRect.width = Math.max(minSize, Math.min(maxW, s.width + dx));
            }
            if (dragging.includes('n')) {
                const maxH = s.y + s.height - bounds.y;
                const requestedH = s.height - dy;
                const finalH = Math.max(minSize, Math.min(maxH, requestedH));
                newRect.y = s.y + s.height - finalH;
                newRect.height = finalH;
            }
            if (dragging.includes('s')) {
                const maxH = bounds.y + bounds.height - s.y;
                newRect.height = Math.max(minSize, Math.min(maxH, s.height + dy));
            }
        }

        // Convert the updated display coordinates back to normalized coordinates instantly
        setNormalizedRect({
            x: Math.max(0, Math.min(1, (newRect.x - imgRect.x) / imgRect.width)),
            y: Math.max(0, Math.min(1, (newRect.y - imgRect.y) / imgRect.height)),
            w: Math.max(0.01, Math.min(1, newRect.width / imgRect.width)),
            h: Math.max(0.01, Math.min(1, newRect.height / imgRect.height))
        });
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    const handleApply = () => {
        if (!imgRect) return;
        const iW = image.naturalWidth || 800;
        const iH = image.naturalHeight || 600;

        // Map normalized coordinates cleanly back to natural image pixels
        const finalCrop: Rect = {
            x: Math.round(normalizedRect.x * iW),
            y: Math.round(normalizedRect.y * iH),
            width: Math.round(normalizedRect.w * iW),
            height: Math.round(normalizedRect.h * iH)
        };

        // Guard against zero-area selections
        if (finalCrop.width > 2 && finalCrop.height > 2) {
            onComplete(finalCrop);
        } else {
            onComplete(null);
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col font-sans select-none">
            {/* Toolbar */}
            <div className="h-14 flex justify-between items-center px-6 bg-neutral-900 border-b border-neutral-800 shrink-0">
                <span className="text-xs font-bold text-white tracking-[0.15em] uppercase">Manual Crop Workspace</span>
                <div className="flex gap-4">
                    {initialCrop && (
                        <button 
                            onClick={() => onComplete(null)} 
                            className="text-rose-500 hover:text-rose-400 text-xs font-bold tracking-wider px-3 py-2 uppercase transition-colors mr-2 cursor-pointer"
                        >
                            Reset Crop
                        </button>
                    )}
                    <button 
                        onClick={onCancel} 
                        className="text-neutral-400 hover:text-white text-xs font-bold tracking-wider px-3 py-2 uppercase transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleApply} 
                        className="bg-white text-black px-5 py-2 rounded-lg text-xs font-bold tracking-[0.1em] hover:bg-neutral-200 transition-colors cursor-pointer uppercase"
                    >
                        Apply
                    </button>
                </div>
            </div>
            
            {/* Workspace bounds */}
            <div 
                className="flex-1 relative overflow-hidden flex items-center justify-center bg-neutral-950"
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {isGeneratingSafeSrc || !safeSrc ? (
                    <div className="text-center space-y-2">
                        <div className="w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full animate-spin mx-auto"></div>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Generating Crop Workspace...</span>
                    </div>
                ) : (
                    imgRect && (
                        <div style={{ width: imgRect.width, height: imgRect.height, position: 'relative' }}>
                            {/* Background Base Image */}
                            <img 
                                src={safeSrc} 
                                alt="Crop Preview Base" 
                                className="w-full h-full object-contain opacity-40 pointer-events-none select-none" 
                            />
                            
                            {/* Interactive Crop Selector overlay */}
                            {rect && (
                                <>
                                    {/* Clear Mask Overlay area */}
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            left: rect.x - imgRect.x,
                                            top: rect.y - imgRect.y,
                                            width: rect.width,
                                            height: rect.height,
                                            backgroundImage: `url(${safeSrc})`,
                                            backgroundPosition: `-${(rect.x - imgRect.x)}px -${(rect.y - imgRect.y)}px`,
                                            backgroundSize: `${imgRect.width}px ${imgRect.height}px`,
                                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)'
                                        }}
                                        className="cursor-move border border-white"
                                        onMouseDown={(e) => handleMouseDown(e, 'move')}
                                    >
                                        {/* Grid Lines for Rule of Thirds calibration */}
                                        <div className="absolute inset-0 flex flex-col pointer-events-none opacity-25">
                                            <div className="flex-1 border-b border-white"></div>
                                            <div className="flex-1 border-b border-white"></div>
                                            <div className="flex-1"></div>
                                        </div>
                                        <div className="absolute inset-0 flex pointer-events-none opacity-25">
                                            <div className="flex-1 border-r border-white"></div>
                                            <div className="flex-1 border-r border-white"></div>
                                            <div className="flex-1"></div>
                                        </div>

                                        {/* Accent corner dragging selectors */}
                                        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-[3px] border-l-[3px] border-white cursor-nw-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-[3px] border-r-[3px] border-white cursor-ne-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                                        <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-[3px] border-l-[3px] border-white cursor-sw-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                                        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-[3px] border-r-[3px] border-white cursor-se-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'se')} />
                                    </div>
                                </>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Cropper;
