
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
    const [rect, setRect] = useState<Rect | null>(null);
    const [imgRect, setImgRect] = useState<Rect | null>(null);
    const [dragging, setDragging] = useState<'nw' | 'ne' | 'sw' | 'se' | 'move' | null>(null);
    const dragStart = useRef<{x: number, y: number} | null>(null);
    const rectStart = useRef<Rect | null>(null);

    // Initialize
    useEffect(() => {
        if (!containerRef.current) return;
        
        // Calculate aspect-fit dimensions of the image within the container
        const container = containerRef.current;
        const cW = container.clientWidth;
        const cH = container.clientHeight;
        const iW = image.naturalWidth;
        const iH = image.naturalHeight;
        
        const ratio = Math.min(cW / iW, cH / iH);
        const displayW = iW * ratio;
        const displayH = iH * ratio;
        const offsetX = (cW - displayW) / 2;
        const offsetY = (cH - displayH) / 2;
        
        const displayRect = { x: offsetX, y: offsetY, width: displayW, height: displayH };
        setImgRect(displayRect);

        // Set initial crop selection (scaled to display)
        if (initialCrop) {
            setRect({
                x: offsetX + (initialCrop.x * ratio),
                y: offsetY + (initialCrop.y * ratio),
                width: initialCrop.width * ratio,
                height: initialCrop.height * ratio
            });
        } else {
            // Default to slightly inset full crop
            const inset = 20;
            setRect({
                x: offsetX + inset,
                y: offsetY + inset,
                width: displayW - (inset*2),
                height: displayH - (inset*2)
            });
        }
    }, [image, initialCrop]);

    const handleMouseDown = (e: React.MouseEvent, type: 'nw' | 'ne' | 'sw' | 'se' | 'move') => {
        e.stopPropagation();
        e.preventDefault();
        setDragging(type);
        dragStart.current = { x: e.clientX, y: e.clientY };
        if (rect) rectStart.current = { ...rect };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !dragStart.current || !rectStart.current || !imgRect) return;
        
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const s = rectStart.current;
        const bounds = imgRect;
        
        let newRect = { ...s };
        
        if (dragging === 'move') {
            newRect.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width - s.width, s.x + dx));
            newRect.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height - s.height, s.y + dy));
        } else {
            if (dragging.includes('w')) {
                const w = Math.max(50, s.width - dx);
                const x = s.x + s.width - w;
                if (x >= bounds.x) { newRect.x = x; newRect.width = w; }
            }
            if (dragging.includes('e')) {
                newRect.width = Math.max(50, Math.min(bounds.width - (s.x - bounds.x), s.width + dx));
            }
            if (dragging.includes('n')) {
                const h = Math.max(50, s.height - dy);
                const y = s.y + s.height - h;
                if (y >= bounds.y) { newRect.y = y; newRect.height = h; }
            }
            if (dragging.includes('s')) {
                newRect.height = Math.max(50, Math.min(bounds.height - (s.y - bounds.y), s.height + dy));
            }
        }
        
        setRect(newRect);
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    const handleApply = () => {
        if (!rect || !imgRect) return;
        // Convert display coords back to image natural coords
        const ratio = image.naturalWidth / imgRect.width;
        const finalCrop: Rect = {
            x: Math.round((rect.x - imgRect.x) * ratio),
            y: Math.round((rect.y - imgRect.y) * ratio),
            width: Math.round(rect.width * ratio),
            height: Math.round(rect.height * ratio)
        };
        onComplete(finalCrop);
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
            {/* Toolbar */}
            <div className="h-14 flex justify-between items-center px-4 bg-neutral-900 border-b border-neutral-800">
                <span className="text-sm font-bold text-white tracking-wider">CROP MODE</span>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="text-neutral-400 hover:text-white text-xs font-bold tracking-wider px-3 py-2">CANCEL</button>
                    <button onClick={handleApply} className="bg-white text-black px-4 py-1.5 rounded text-xs font-bold tracking-wider hover:bg-neutral-200">APPLY</button>
                </div>
            </div>
            
            {/* Workspace */}
            <div 
                className="flex-1 relative overflow-hidden flex items-center justify-center bg-neutral-950 select-none"
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {imgRect && (
                    <div style={{ width: imgRect.width, height: imgRect.height, position: 'relative' }}>
                        {/* Background Image */}
                        <img 
                            src={image.src} 
                            alt="Crop Source" 
                            className="w-full h-full object-contain opacity-50 pointer-events-none" 
                        />
                        
                        {/* Crop Selection */}
                        {rect && (
                            <>
                                {/* Clear Area (The Crop) */}
                                <div 
                                    style={{
                                        position: 'absolute',
                                        left: rect.x - imgRect.x,
                                        top: rect.y - imgRect.y,
                                        width: rect.width,
                                        height: rect.height,
                                        backgroundImage: `url(${image.src})`,
                                        backgroundPosition: `-${(rect.x - imgRect.x)}px -${(rect.y - imgRect.y)}px`,
                                        backgroundSize: `${imgRect.width}px ${imgRect.height}px`,
                                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)'
                                    }}
                                    className="cursor-move border border-white"
                                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                                >
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 flex flex-col pointer-events-none opacity-30">
                                        <div className="flex-1 border-b border-white/50"></div>
                                        <div className="flex-1 border-b border-white/50"></div>
                                        <div className="flex-1"></div>
                                    </div>
                                    <div className="absolute inset-0 flex pointer-events-none opacity-30">
                                        <div className="flex-1 border-r border-white/50"></div>
                                        <div className="flex-1 border-r border-white/50"></div>
                                        <div className="flex-1"></div>
                                    </div>

                                    {/* Handles */}
                                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-white cursor-nw-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-white cursor-ne-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                                    <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-white cursor-sw-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-white cursor-se-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'se')} />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cropper;
