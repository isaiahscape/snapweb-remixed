
import React from 'react';
import { ColorGradeState, ColorChannel, ColorAdjustment } from '../types';
import { Slider } from './Controls';

interface ColorMixerProps {
  colorGrade: ColorGradeState;
  activeChannel: ColorChannel;
  isPickerActive: boolean;
  onChannelSelect: (channel: ColorChannel) => void;
  onChange: (channel: ColorChannel, adjustment: ColorAdjustment) => void;
  onTogglePicker: () => void;
}

const CHANNEL_COLORS: Record<ColorChannel, string> = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    aqua: '#06b6d4',
    blue: '#3b82f6',
    purple: '#a855f7',
    magenta: '#d946ef',
};

const ColorMixer: React.FC<ColorMixerProps> = ({ 
    colorGrade, 
    activeChannel, 
    isPickerActive,
    onChannelSelect, 
    onChange,
    onTogglePicker
}) => {
    const currentAdj = colorGrade[activeChannel];

    const update = (key: keyof ColorAdjustment, val: number) => {
        onChange(activeChannel, { ...currentAdj, [key]: val });
    };

    const reset = (key: keyof ColorAdjustment) => {
        onChange(activeChannel, { ...currentAdj, [key]: 0 });
    };

    return (
        <div className="animate-slideDown">
            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Select Color Range</span>
                <button 
                    onClick={onTogglePicker}
                    className={`p-1.5 rounded border transition-all ${isPickerActive ? 'bg-blue-600 border-blue-600 text-white' : 'border-neutral-700 text-neutral-400 hover:text-white'}`}
                    title="Pick Color from Image"
                >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                </button>
            </div>

            {/* Color Dots */}
            <div className="flex justify-between mb-6 px-1">
                {(Object.keys(CHANNEL_COLORS) as ColorChannel[]).map(c => (
                    <button
                        key={c}
                        onClick={() => onChannelSelect(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 relative ${activeChannel === c ? 'border-white scale-110 shadow-glow' : 'border-transparent'}`}
                        style={{ backgroundColor: CHANNEL_COLORS[c] }}
                        title={c.charAt(0).toUpperCase() + c.slice(1)}
                    >
                        {/* Show small dot if edited */}
                        {(colorGrade[c].hue !== 0 || colorGrade[c].saturation !== 0 || colorGrade[c].luminance !== 0) && (
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Sliders */}
            <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800/50">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase text-white border-b border-neutral-800 pb-2">
                    <div className="w-3 h-3 rounded-full" style={{background: CHANNEL_COLORS[activeChannel]}}></div>
                    {activeChannel} Adjustment
                </div>
                
                <Slider 
                    label="Hue" 
                    min={-100} 
                    max={100} 
                    value={currentAdj.hue} 
                    onChange={(v) => update('hue', v)} 
                    onReset={() => reset('hue')}
                />
                <Slider 
                    label="Saturation" 
                    min={-100} 
                    max={100} 
                    value={currentAdj.saturation} 
                    onChange={(v) => update('saturation', v)} 
                    onReset={() => reset('saturation')}
                />
                <Slider 
                    label="Luminance" 
                    min={-100} 
                    max={100} 
                    value={currentAdj.luminance} 
                    onChange={(v) => update('luminance', v)} 
                    onReset={() => reset('luminance')}
                />
            </div>
        </div>
    );
};

export default ColorMixer;
