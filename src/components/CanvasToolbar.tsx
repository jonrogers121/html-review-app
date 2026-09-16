import React from 'react';
import {
  MousePointer,
  MessageSquarePlus,
  PenTool,
  Square,
  ArrowUpRight,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ActiveTool, ViewportMode } from '../types';

interface CanvasToolbarProps {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  onClearAnnotations: () => void;
  annotationCount: number;
  viewportMode: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  activeTool,
  onToolChange,
  onClearAnnotations,
  annotationCount,
  viewportMode,
  onViewportChange,
  zoomLevel,
  onZoomChange
}) => {
  return (
    <div 
      id="canvas-review-toolbar"
      className="h-12 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 select-none shadow-2xs gap-4"
    >
      {/* Left: Review Interaction & Annotation Tools */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs font-semibold">
          {/* Browse Mode */}
          <button
            id="canvas-tool-browse-btn"
            onClick={() => onToolChange('browse')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTool === 'browse'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title="Browse & interact directly with prototype elements (Hot-key: V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Browse</span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">(V)</span>
          </button>

          {/* Pin Comment Mode */}
          <button
            id="canvas-tool-pin-btn"
            onClick={() => onToolChange(activeTool === 'comment' ? 'browse' : 'comment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTool === 'comment'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-bold ring-1 ring-amber-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title="Point & click anywhere on prototype to pin a comment (Hot-key: C)"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{activeTool === 'comment' ? 'Placing Pin...' : 'Add Comment'}</span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">(C)</span>
          </button>

          {/* Vertical Divider */}
          <div className="w-px h-4 bg-slate-300 mx-1 shrink-0" />

          {/* Freehand Pen */}
          <button
            id="canvas-tool-pencil-btn"
            onClick={() => onToolChange('pencil')}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              activeTool === 'pencil'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title="Draw freehand markup (Hot-key: P)"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>

          {/* Rectangle Highlight */}
          <button
            id="canvas-tool-rectangle-btn"
            onClick={() => onToolChange('rectangle')}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              activeTool === 'rectangle'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title="Draw rectangle highlight (Hot-key: R)"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          {/* Callout Arrow */}
          <button
            id="canvas-tool-arrow-btn"
            onClick={() => onToolChange('arrow')}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              activeTool === 'arrow'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            title="Draw callout arrow (Hot-key: A)"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* Clear Annotations */}
          {annotationCount > 0 && (
            <>
              <div className="w-px h-4 bg-slate-300 mx-1 shrink-0" />
              <button
                id="canvas-tool-clear-btn"
                onClick={onClearAnnotations}
                className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
                title={`Clear ${annotationCount} drawing markups`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">Clear ({annotationCount})</span>
              </button>
            </>
          )}
        </div>

        {activeTool === 'comment' && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Click prototype to place pin • Esc to cancel</span>
          </div>
        )}
      </div>

      {/* Center: Device Viewport Presets */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs font-semibold">
          <button
            id="canvas-viewport-desktop-btn"
            onClick={() => onViewportChange('desktop')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              viewportMode === 'desktop'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
            title="Desktop Viewport (1280px)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desktop</span>
            <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">1280px</span>
          </button>

          <button
            id="canvas-viewport-tablet-btn"
            onClick={() => onViewportChange('tablet')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              viewportMode === 'tablet'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
            title="Tablet Viewport (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tablet</span>
            <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">768px</span>
          </button>

          <button
            id="canvas-viewport-mobile-btn"
            onClick={() => onViewportChange('mobile')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              viewportMode === 'mobile'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
            title="Mobile Viewport (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mobile</span>
            <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">375px</span>
          </button>

          <button
            id="canvas-viewport-fluid-btn"
            onClick={() => onViewportChange('fluid')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              viewportMode === 'fluid'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/60 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
            title="Fluid Viewport (100% responsive width)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fluid</span>
          </button>
        </div>
      </div>

      {/* Right: Zoom Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-600">
          <button
            id="canvas-zoom-out-btn"
            onClick={() => onZoomChange(Math.max(0.5, Number((zoomLevel - 0.1).toFixed(1))))}
            className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center transition-colors text-slate-700"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            id="canvas-zoom-reset-btn"
            onClick={() => onZoomChange(1.0)}
            className="w-12 text-center font-mono text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors"
            title="Reset zoom to 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <button
            id="canvas-zoom-in-btn"
            onClick={() => onZoomChange(Math.min(1.5, Number((zoomLevel + 0.1).toFixed(1))))}
            className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center transition-colors text-slate-700"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {zoomLevel !== 1.0 && (
          <button
            id="canvas-zoom-fit-btn"
            onClick={() => onZoomChange(1.0)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Reset to 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
