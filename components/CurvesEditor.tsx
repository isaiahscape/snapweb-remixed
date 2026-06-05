import React, { useState, useRef, useEffect } from 'react';
import { CurvePoint } from '../types';

interface CurvesEditorProps {
  curves: {
    rgb: CurvePoint[];
    r: CurvePoint[];
    g: CurvePoint[];
    b: CurvePoint[];
  };
  onChange: (newCurves: {
    rgb: CurvePoint[];
    r: CurvePoint[];
    g: CurvePoint[];
    b: CurvePoint[];
  }) => void;
}

export const CurvesEditor: React.FC<CurvesEditorProps> = ({ curves, onChange }) => {
  const [channel, setChannel] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);

  const currentPoints = curves[channel] || [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  // Reset current channel
  const handleResetChannel = () => {
    const updated = {
      ...curves,
      [channel]: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
    };
    onChange(updated);
  };

  // Convert SVG coordinate to Normalized (0..1)
  const getNormalizedCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    // Y-axis is inverted in standard graph vs SVG space
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    svgRef.current.setPointerCapture(e.pointerId);

    const rect = svgRef.current.getBoundingClientRect();
    const clickCoords = getNormalizedCoords(e.clientX, e.clientY);
    if (!clickCoords) return;

    // Threshold for selecting an existing point (in normal space pixels)
    const tolerance = 0.06; // roughly 12-15 pixels in a 200x200 box
    let foundIdx = -1;
    let minDist = Infinity;

    currentPoints.forEach((pt, idx) => {
      // Euclidean distance
      const dist = Math.sqrt((pt.x - clickCoords.x) ** 2 + (pt.y - clickCoords.y) ** 2);
      if (dist < tolerance && dist < minDist) {
        minDist = dist;
        foundIdx = idx;
      }
    });

    if (foundIdx !== -1) {
      // Select existing point
      setActivePointIdx(foundIdx);
    } else {
      // Add a new point if it's not on the immediate borders
      if (clickCoords.x > 0.05 && clickCoords.x < 0.95) {
        const sorted = [...currentPoints];
        // Insert and sort
        sorted.push({ x: clickCoords.x, y: clickCoords.y });
        sorted.sort((a, b) => a.x - b.x);
        
        // Find newly added point's index
        const newIdx = sorted.findIndex(pt => pt.x === clickCoords.x && pt.y === clickCoords.y);
        
        const updated = {
          ...curves,
          [channel]: sorted
        };
        onChange(updated);
        setActivePointIdx(newIdx);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointIdx === null || !svgRef.current) return;

    const coords = getNormalizedCoords(e.clientX, e.clientY);
    if (!coords) return;

    const updatedPoints = [...currentPoints];
    const isEndpoint = activePointIdx === 0 || activePointIdx === currentPoints.length - 1;

    if (isEndpoint) {
      // Endpoints only slide vertically (Y range)
      updatedPoints[activePointIdx] = {
        x: updatedPoints[activePointIdx].x, // lock X
        y: coords.y
      };
    } else {
      // Middle points can move in both X & Y, but must remain ordered between neighbors
      const prevPt = currentPoints[activePointIdx - 1];
      const nextPt = currentPoints[activePointIdx + 1];
      
      // Enforce custom boundaries so points don't jump cross order
      const minX = prevPt.x + 0.02;
      const maxX = nextPt.x - 0.02;
      
      updatedPoints[activePointIdx] = {
        x: Math.max(minX, Math.min(maxX, coords.x)),
        y: coords.y
      };
    }

    onChange({
      ...curves,
      [channel]: updatedPoints
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setActivePointIdx(null);
    if (svgRef.current) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Double click on point to delete it (only works for interior points)
  const handleDoubleClickPoint = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx === 0 || idx === currentPoints.length - 1) return; // cannot delete anchors

    const updatedPoints = currentPoints.filter((_, i) => i !== idx);
    onChange({
      ...curves,
      [channel]: updatedPoints
    });
    setActivePointIdx(null);
  };

  // Color mappings for channels
  const strokeColors = {
    rgb: '#ffffff',
    r: '#ef4444',
    g: '#22c55e',
    b: '#3b82f6'
  };

  const fillColors = {
    rgb: '#4b5563',
    r: '#b91c1c',
    g: '#15803d',
    b: '#1d4ed8'
  };

  return (
    <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-900 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
          Curves Toning
        </span>
        <button
          onClick={handleResetChannel}
          className="text-[9px] font-bold text-neutral-500 hover:text-white uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-2 py-1 rounded transition-colors"
          title="Reset current tone curve"
        >
          Reset Curve
        </button>
      </div>

      {/* Grid Channel Selection Tabbar */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 bg-neutral-900/50 p-1 rounded-md border border-neutral-900">
        {(['rgb', 'r', 'g', 'b'] as const).map(ch => {
          const isActive = channel === ch;
          const bgColors = {
            rgb: isActive ? 'bg-white text-black' : 'hover:bg-neutral-800 text-neutral-400',
            r: isActive ? 'bg-red-600 text-white' : 'hover:bg-neutral-850 text-red-500/80',
            g: isActive ? 'bg-emerald-600 text-white' : 'hover:bg-neutral-850 text-emerald-500/80',
            b: isActive ? 'bg-blue-600 text-white' : 'hover:bg-neutral-850 text-blue-500/80'
          };
          
          return (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`p-1 text-[9px] font-extrabold uppercase rounded-md text-center transition-all cursor-pointer ${bgColors[ch]}`}
            >
              {ch === 'rgb' ? 'RGB' : ch.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Curve interactive plotting SVG */}
      <div className="relative aspect-square w-full bg-[#0a0a0a] border border-neutral-800 rounded-md overflow-hidden select-none">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Grid lines (quarter divisions) */}
          <line x1="25%" y1="0%" x2="25%" y2="100%" stroke="#1e1e1e" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="75%" y1="0%" x2="75%" y2="100%" stroke="#1e1e1e" strokeWidth="1" strokeDasharray="3,3" />
          
          <line x1="0%" y1="25%" x2="100%" y2="25%" stroke="#1e1e1e" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="0%" y1="75%" x2="100%" y2="75%" stroke="#1e1e1e" strokeWidth="1" strokeDasharray="3,3" />

          {/* Core Diagonal guide line */}
          <line x1="0" y1="100%" x2="100%" y2="0" stroke="#333" strokeWidth="1.2" strokeOpacity="0.4" />

          {/* Curve path */}
          <polyline
            fill="none"
            stroke={strokeColors[channel]}
            strokeWidth="2.5"
            points={currentPoints
              .map(pt => `${pt.x * 100}%,${(1 - pt.y) * 100}%`)
              .join(' ')}
          />

          {/* Interactive control nodes */}
          {currentPoints.map((pt, idx) => {
            const isSelected = activePointIdx === idx;
            const cx = `${pt.x * 100}%`;
            const cy = `${(1 - pt.y) * 100}%`;

            return (
              <g key={idx}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onDoubleClick={(e) => handleDoubleClickPoint(idx, e)}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? "6" : "4"}
                  fill={isSelected ? '#38bdf8' : strokeColors[channel]}
                  stroke="#121212"
                  strokeWidth="2"
                  className="pointer-events-none transition-all duration-75 shadow-lg"
                />
              </g>
            );
          })}
        </svg>

        {/* Informational tooltips */}
        <div className="absolute bottom-2 left-2 flex gap-2 pointer-events-none text-[8px] font-mono text-neutral-400">
          <div className="bg-black/75 rounded px-1.5 py-0.5 border border-neutral-800">
            Click curve to add keypoint
          </div>
          <div className="bg-black/75 rounded px-1.5 py-0.5 border border-neutral-800">
            Double click to delete keypoint
          </div>
        </div>
      </div>
    </div>
  );
};
