import React, { useRef, useState } from 'react';
import { OverlayItem, OverlayBlendMode } from '../types';
import { 
  Plus, Trash2, Eye, EyeOff, Image as ImageIcon, Type, 
  Sparkles, RotateCw, Layers, Sliders, ChevronDown, Check
} from 'lucide-react';

interface WatermarkEditorProps {
  overlays: OverlayItem[];
  onChange: (overlays: OverlayItem[]) => void;
  onClose?: () => void;
}

const BLEND_MODES: { label: string; value: OverlayBlendMode }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Screen (Lighten)', value: 'screen' },
  { label: 'Multiply (Darken)', value: 'multiply' },
  { label: 'Overlay (Contrast)', value: 'overlay' },
  { label: 'Soft Light', value: 'soft-light' }
];

const FONTS = [
  { label: 'Modern Sans', value: 'Inter, system-ui, sans-serif' },
  { label: 'Classic Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
  { label: 'Display Script', value: 'cursive' }
];

const ANCHOR_POINTS = [
  { label: 'Top Left', x: 0.12, y: 0.12 },
  { label: 'Top Center', x: 0.5, y: 0.12 },
  { label: 'Top Right', x: 0.88, y: 0.12 },
  { label: 'Center Left', x: 0.12, y: 0.5 },
  { label: 'Center', x: 0.5, y: 0.5 },
  { label: 'Center Right', x: 0.88, y: 0.5 },
  { label: 'Bottom Left', x: 0.12, y: 0.88 },
  { label: 'Bottom Center', x: 0.5, y: 0.88 },
  { label: 'Bottom Right', x: 0.88, y: 0.88 },
];

export const WatermarkEditor: React.FC<WatermarkEditorProps> = ({
  overlays,
  onChange,
  onClose
}) => {
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(
    overlays.length > 0 ? overlays[0].id : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOverlay = overlays.find(o => o.id === activeOverlayId) || overlays[0] || null;

  const updateActiveOverlay = (updates: Partial<OverlayItem>) => {
    if (!activeOverlay) return;
    const next = overlays.map(item => 
      item.id === activeOverlay.id ? { ...item, ...updates } : item
    );
    onChange(next);
  };

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const newOverlay: OverlayItem = {
        id: 'ov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: 'image',
        src: dataUrl,
        x: 0.85,
        y: 0.85,
        scale: 0.22,
        rotation: 0,
        opacity: 85,
        blendMode: 'normal',
        visible: true,
        shadow: true
      };
      onChange([...overlays, newOverlay]);
      setActiveOverlayId(newOverlay.id);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddTextWatermark = () => {
    const newOverlay: OverlayItem = {
      id: 'ov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'text',
      text: '© SNAPSEED FOR WEB',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#ffffff',
      x: 0.5,
      y: 0.9,
      scale: 0.05,
      rotation: 0,
      opacity: 80,
      blendMode: 'normal',
      visible: true,
      shadow: true
    };
    onChange([...overlays, newOverlay]);
    setActiveOverlayId(newOverlay.id);
  };

  const handleAddIconBadge = (iconName: string) => {
    const newOverlay: OverlayItem = {
      id: 'ov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'icon',
      iconName,
      color: '#ffffff',
      x: 0.88,
      y: 0.88,
      scale: 0.12,
      rotation: 0,
      opacity: 85,
      blendMode: 'normal',
      visible: true,
      shadow: true
    };
    onChange([...overlays, newOverlay]);
    setActiveOverlayId(newOverlay.id);
  };

  const handleDeleteOverlay = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = overlays.filter(o => o.id !== id);
    onChange(next);
    if (activeOverlayId === id) {
      setActiveOverlayId(next.length > 0 ? next[0].id : null);
    }
  };

  const handleToggleVisible = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(
      overlays.map(o => o.id === id ? { ...o, visible: !o.visible } : o)
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Watermarks & Logos
          </h3>
          <p className="text-[9px] text-neutral-500 mt-0.5">
            Add custom stamps, icons, and signatures
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[9px] text-neutral-400 hover:text-white font-extrabold uppercase bg-neutral-900 hover:bg-neutral-850 px-2 py-1 rounded border border-neutral-800 transition cursor-pointer"
          >
            Done
          </button>
        )}
      </div>

      {/* Creation Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer text-center group"
        >
          <ImageIcon className="w-4 h-4 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold text-neutral-200 uppercase">Add Logo</span>
          <span className="text-[7px] text-neutral-500 font-mono">PNG / SVG</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          className="hidden"
          onChange={handleUploadLogo}
        />

        <button
          onClick={handleAddTextWatermark}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer text-center group"
        >
          <Type className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold text-neutral-200 uppercase">Add Text</span>
          <span className="text-[7px] text-neutral-500 font-mono">Typography</span>
        </button>

        <button
          onClick={() => handleAddIconBadge('camera')}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer text-center group"
        >
          <Sparkles className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold text-neutral-200 uppercase">Add Badge</span>
          <span className="text-[7px] text-neutral-500 font-mono">Vector Icon</span>
        </button>
      </div>

      {/* Layer List */}
      {overlays.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>Active Overlay Layers ({overlays.length})</span>
          </div>

          <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
            {overlays.map((ov, idx) => {
              const isSelected = activeOverlay?.id === ov.id;
              return (
                <div
                  key={ov.id}
                  onClick={() => setActiveOverlayId(ov.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-neutral-850 border-neutral-700 text-white shadow-sm'
                      : 'bg-neutral-900/50 border-neutral-800/80 text-neutral-400 hover:bg-neutral-850/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[9px] font-mono text-neutral-500">#{idx + 1}</span>
                    <span className="text-[10px] font-semibold truncate">
                      {ov.type === 'text' 
                        ? (ov.text || 'Text Watermark') 
                        : ov.type === 'image' 
                        ? 'Custom Logo PNG' 
                        : `Badge (${ov.iconName})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleToggleVisible(ov.id, e)}
                      className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 cursor-pointer"
                      title={ov.visible ? 'Hide Overlay' : 'Show Overlay'}
                    >
                      {ov.visible ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 opacity-50" />}
                    </button>
                    <button
                      onClick={(e) => handleDeleteOverlay(ov.id, e)}
                      className="p-1 text-neutral-500 hover:text-red-400 rounded hover:bg-neutral-800 cursor-pointer"
                      title="Delete Overlay"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Overlay Adjustments */}
      {activeOverlay && (
        <div className="pt-2 border-t border-neutral-900 space-y-3.5">
          <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3 h-3" />
            <span>Layer Controls</span>
          </div>

          {/* Text Input if Text overlay */}
          {activeOverlay.type === 'text' && (
            <div className="space-y-2">
              <div>
                <label className="text-[9px] font-bold text-neutral-400 uppercase">Text Content</label>
                <input
                  type="text"
                  value={activeOverlay.text || ''}
                  onChange={(e) => updateActiveOverlay({ text: e.target.value })}
                  placeholder="Enter watermark text..."
                  className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">Font Style</label>
                  <select
                    value={activeOverlay.fontFamily || FONTS[0].value}
                    onChange={(e) => updateActiveOverlay({ fontFamily: e.target.value })}
                    className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1.5 text-[10px] text-neutral-300 focus:outline-none"
                  >
                    {FONTS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-neutral-400 uppercase">Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={activeOverlay.color || '#ffffff'}
                      onChange={(e) => updateActiveOverlay({ color: e.target.value })}
                      className="w-7 h-7 bg-transparent rounded border border-neutral-700 cursor-pointer p-0"
                    />
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">{activeOverlay.color || '#FFFFFF'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Badge Picker if Icon overlay */}
          {activeOverlay.type === 'icon' && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-neutral-400 uppercase">Badge Shape</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['camera', 'copyright', 'star'] as const).map(icon => (
                  <button
                    key={icon}
                    onClick={() => updateActiveOverlay({ iconName: icon })}
                    className={`p-2 rounded border text-center text-[10px] font-bold uppercase transition cursor-pointer ${
                      activeOverlay.iconName === icon
                        ? 'bg-neutral-800 border-cyan-500 text-cyan-400'
                        : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Anchor Placement Grid */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-neutral-400 uppercase">Quick Placement</label>
            <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1.5 rounded-lg border border-neutral-900 max-w-[150px]">
              {ANCHOR_POINTS.map((pt, i) => {
                const isSelected = Math.abs(activeOverlay.x - pt.x) < 0.05 && Math.abs(activeOverlay.y - pt.y) < 0.05;
                return (
                  <button
                    key={i}
                    onClick={() => updateActiveOverlay({ x: pt.x, y: pt.y })}
                    className={`h-6 rounded border transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-400 text-black'
                        : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-500'
                    }`}
                    title={pt.label}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size / Scale Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="font-semibold text-neutral-400 uppercase">Scale</span>
              <span className="font-mono text-neutral-300">{Math.round((activeOverlay.scale || 0.2) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.04"
              max="0.8"
              step="0.01"
              value={activeOverlay.scale || 0.2}
              onChange={(e) => updateActiveOverlay({ scale: parseFloat(e.target.value) })}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Opacity Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="font-semibold text-neutral-400 uppercase">Opacity</span>
              <span className="font-mono text-neutral-300">{activeOverlay.opacity}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={activeOverlay.opacity}
              onChange={(e) => updateActiveOverlay({ opacity: parseInt(e.target.value) })}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Rotation Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="font-semibold text-neutral-400 uppercase">Rotation</span>
              <span className="font-mono text-neutral-300">{activeOverlay.rotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={activeOverlay.rotation}
              onChange={(e) => updateActiveOverlay({ rotation: parseInt(e.target.value) })}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Blend Mode & Shadow Toggle */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase">Blend Mode</label>
              <select
                value={activeOverlay.blendMode || 'normal'}
                onChange={(e) => updateActiveOverlay({ blendMode: e.target.value as OverlayBlendMode })}
                className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1.5 text-[10px] text-neutral-300 focus:outline-none"
              >
                {BLEND_MODES.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase">Drop Shadow</label>
              <button
                type="button"
                onClick={() => updateActiveOverlay({ shadow: !activeOverlay.shadow })}
                className={`w-full mt-1 py-1.5 px-2 rounded-md border text-[10px] font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeOverlay.shadow
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-neutral-950 border-neutral-850 text-neutral-500'
                }`}
              >
                {activeOverlay.shadow && <Check className="w-3 h-3 text-cyan-400" />}
                <span>{activeOverlay.shadow ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
