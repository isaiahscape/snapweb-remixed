import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ImageState, CustomPreset } from '../types';
import { saveCustomPreset, exportPresetsAsJSON, importPresetsFromJSON } from '../services/storageService';
import { X, Sparkles, Download, Upload, Check, Bookmark } from 'lucide-react';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: ImageState;
  onPresetSaved: (preset: CustomPreset) => void;
  onPresetsImported: () => void;
}

const GRADIENT_PRESETS = [
  'from-pink-400 via-rose-500 to-amber-300',
  'from-cyan-400 via-blue-500 to-indigo-600',
  'from-amber-400 via-orange-500 to-red-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-purple-400 via-violet-500 to-pink-500',
  'from-neutral-700 via-neutral-800 to-black'
];

export const PresetModal: React.FC<PresetModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onPresetSaved,
  onPresetsImported
}) => {
  const [presetName, setPresetName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [includeOverlays, setIncludeOverlays] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;

    setIsSaving(true);
    try {
      // Clone state without individual photo crops/masks unless specified
      const adjustments: Partial<ImageState> = {
        brightness: currentState.brightness,
        contrast: currentState.contrast,
        saturation: currentState.saturation,
        ambiance: currentState.ambiance,
        warmth: currentState.warmth,
        tint: currentState.tint,
        highlights: currentState.highlights,
        shadows: currentState.shadows,
        structure: currentState.structure,
        sharpening: currentState.sharpening,
        dehaze: currentState.dehaze,
        grain: currentState.grain,
        vignette: currentState.vignette,
        tonalContrast: currentState.tonalContrast,
        tonalHighTones: currentState.tonalHighTones,
        tonalMidTones: currentState.tonalMidTones,
        tonalLowTones: currentState.tonalLowTones,
        colorGrade: { ...currentState.colorGrade },
        curves: {
          rgb: [...currentState.curves.rgb],
          r: [...currentState.curves.r],
          g: [...currentState.curves.g],
          b: [...currentState.curves.b]
        },
        hdrScape: { ...currentState.hdrScape },
        grainyFilm: { ...currentState.grainyFilm },
        rawTemperature: currentState.rawTemperature,
        rawTint: currentState.rawTint,
        rawExposureEV: currentState.rawExposureEV,
        rawHighlights: currentState.rawHighlights,
        rawShadows: currentState.rawShadows,
        rawProfile: currentState.rawProfile,
        overlays: includeOverlays ? [...currentState.overlays] : []
      };

      const newPreset: CustomPreset = {
        id: 'preset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: presetName.trim(),
        description: description.trim() || 'Custom created look adjustment profile',
        createdAt: Date.now(),
        gradient: selectedGradient,
        adjustments
      };

      await saveCustomPreset(newPreset);
      onPresetSaved(newPreset);
      onClose();
    } catch (err) {
      console.error('Failed to save preset:', err);
      alert('Error saving custom preset.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportAllJSON = async () => {
    try {
      const json = await exportPresetsAsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapseed_custom_presets_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const { count } = await importPresetsFromJSON(text);
        alert(`Successfully imported ${count} custom preset${count > 1 ? 's' : ''}!`);
        onPresetsImported();
        onClose();
      } catch (err: any) {
        alert(err.message || 'Failed to import preset pack.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden z-10 shadow-2xl text-left"
      >
        <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black tracking-wider uppercase text-white">Save Custom Look</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Preset Title</label>
            <input
              type="text"
              required
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g. Cine Gold, Moody Portrait..."
              className="w-full mt-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Warm highlights with lifted film shadows"
              className="w-full mt-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Badge Gradient Selector */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Color Theme Badge</label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {GRADIENT_PRESETS.map((grad, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSelectedGradient(grad)}
                  className={`h-8 rounded-lg bg-gradient-to-tr ${grad} transition cursor-pointer flex items-center justify-center border ${
                    selectedGradient === grad ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {selectedGradient === grad && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Overlays toggle */}
          {currentState.overlays && currentState.overlays.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeOverlays}
                onChange={(e) => setIncludeOverlays(e.target.checked)}
                className="rounded bg-neutral-950 border-neutral-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-[11px] text-neutral-300 font-medium">
                Include {currentState.overlays.length} watermark/logo overlay(s) in this preset
              </span>
            </label>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaving || !presetName.trim()}
            className="w-full mt-2 py-2.5 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Save to Looks</span>
          </button>
        </form>

        {/* Export / Import presets section */}
        <div className="p-5 border-t border-neutral-800 bg-black/20 flex justify-between items-center">
          <div className="text-[10px] text-neutral-500 font-mono">
            PRESET BACKUP & PACKS
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAllJSON}
              className="text-[10px] font-bold text-neutral-400 hover:text-white uppercase bg-neutral-800 hover:bg-neutral-750 px-2.5 py-1.5 rounded-lg border border-neutral-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Export all presets as JSON file"
            >
              <Download className="w-3 h-3" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="text-[10px] font-bold text-neutral-400 hover:text-white uppercase bg-neutral-800 hover:bg-neutral-750 px-2.5 py-1.5 rounded-lg border border-neutral-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Import preset pack (.json)"
            >
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportJSON}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
