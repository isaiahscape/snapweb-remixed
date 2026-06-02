import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  onReset?: () => void;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, onChange, onReset }) => {
  return (
    <div className="group py-3">
      <div className="flex justify-between items-center mb-2 text-[11px] font-semibold tracking-widest uppercase text-neutral-400 group-hover:text-white transition-colors">
        <span 
          className="cursor-pointer hover:underline decoration-neutral-600 underline-offset-4"
          onClick={onReset}
          title="Click to reset"
        >
            {label}
        </span>
        <span className="tabular-nums text-white">{value > 0 ? `+${value}` : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent"
      />
    </div>
  );
};

interface ButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    className?: string;
    title?: string;
}

export const ToolButton: React.FC<ButtonProps> = ({ children, onClick, active, className = "", title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`
            px-4 py-2 rounded text-sm font-medium transition-all duration-200 border
            ${active 
                ? 'bg-white text-black border-white hover:bg-neutral-200' 
                : 'bg-transparent text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
            }
            ${className}
        `}
    >
        {children}
    </button>
);

export const IconButton: React.FC<Omit<ButtonProps, 'children'> & { icon: React.ReactNode, label?: string }> = ({ icon, label, onClick, active, className = "", title }) => (
    <button 
        onClick={onClick}
        title={title || label}
        className={`p-2 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ${active ? 'text-white bg-neutral-800' : ''} ${className}`}
    >
        <div className="w-5 h-5">{icon}</div>
        {label && <span className="text-[10px] uppercase mt-1">{label}</span>}
    </button>
);