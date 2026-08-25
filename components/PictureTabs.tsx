import React, { useRef, useState, useEffect } from 'react';
import { PictureSession } from '../types';
import { Plus, X, Layers, Copy, Download, RotateCcw, ChevronDown, Clock } from 'lucide-react';

interface PictureTabsProps {
  pictures: PictureSession[];
  activePictureId: string;
  onSelectPicture: (id: string) => void;
  onClosePicture: (id: string) => void;
  onAddPictures: (files: FileList) => void;
  onOpenRecents?: () => void;
  onApplyToAll: () => void;
  onExportAll: () => void;
  onResetAll: () => void;
  isExportingBatch?: boolean;
}

export const PictureTabs: React.FC<PictureTabsProps> = ({
  pictures,
  activePictureId,
  onSelectPicture,
  onClosePicture,
  onAddPictures,
  onOpenRecents,
  onApplyToAll,
  onExportAll,
  onResetAll,
  isExportingBatch = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowBatchMenu(false);
      }
    };
    if (showBatchMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showBatchMenu]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPictures(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="relative z-40 h-11 bg-[#0c0c0c] border-b border-neutral-800 flex items-center justify-between px-3 shrink-0 select-none overflow-visible">
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar h-full py-1 pr-2 max-w-[calc(100%-160px)] sm:max-w-[calc(100%-200px)]"
      >
        {pictures.map((pic, idx) => {
          const isActive = pic.id === activePictureId;
          return (
            <div
              key={pic.id}
              onClick={() => onSelectPicture(pic.id)}
              className={`group relative flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all duration-150 border shrink-0 max-w-[180px] sm:max-w-[220px] ${
                isActive
                  ? 'bg-neutral-850 text-white border-neutral-700 shadow-sm'
                  : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
              title={pic.name}
            >
              <div className="w-5 h-5 rounded overflow-hidden shrink-0 bg-neutral-800 flex items-center justify-center">
                {pic.thumbnailUrl ? (
                  <img
                    src={pic.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] text-neutral-500 font-mono">#{idx + 1}</span>
                )}
              </div>

              <span className="truncate text-[11px] font-medium leading-none">
                {pic.name}
              </span>

              {pic.isRaw && (
                <span className="text-[8px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded shrink-0">
                  RAW
                </span>
              )}

              {pictures.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClosePicture(pic.id);
                  }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors shrink-0 ml-0.5"
                  title="Close image"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-850 border border-dashed border-neutral-750 hover:border-neutral-600 transition-colors shrink-0 cursor-pointer"
          title="Add more photos"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Add Photos</span>
        </button>

        {onOpenRecents && (
          <button
            onClick={onOpenRecents}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition-colors shrink-0 cursor-pointer"
            title="Open Recent Edits in New Tab"
          >
            <Clock className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Recents</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.dng,.cr2,.nef,.arw"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pl-2" ref={menuRef}>
        <span className="text-[10px] font-mono text-neutral-500 hidden md:inline">
          {pictures.length} {pictures.length === 1 ? 'photo' : 'photos'}
        </span>

        {pictures.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowBatchMenu(!showBatchMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Bundle Tools</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showBatchMenu ? 'rotate-180' : ''}`} />
            </button>

            {showBatchMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl py-1.5 z-50 text-left">
                <button
                  onClick={() => {
                    setShowBatchMenu(false);
                    onApplyToAll();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer text-left"
                >
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold leading-tight">Apply Edits to All</div>
                    <div className="text-[10px] text-neutral-500">Sync recipe across open bundle</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowBatchMenu(false);
                    onExportAll();
                  }}
                  disabled={isExportingBatch}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer text-left border-t border-neutral-850"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold leading-tight">Export All Photos</div>
                    <div className="text-[10px] text-neutral-500">Download batch ({pictures.length} files)</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowBatchMenu(false);
                    onResetAll();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer text-left border-t border-neutral-850"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="font-semibold leading-tight">Reset All Edits</div>
                    <div className="text-[10px] text-neutral-500">Revert every image to original</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
