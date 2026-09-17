import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { MousePointer, MessageSquarePlus, X } from 'lucide-react';
import { CanvasToolbar } from './CanvasToolbar';
import type {
  Project,
  CommentPin,
  AnnotationItem,
  ViewportMode,
  ActiveTool,
  UserProfile,
  PinPlacement
} from '../types';
import {
  REVIEW_CANCEL_MESSAGE,
  REVIEW_MODE_MESSAGE,
  REVIEW_OPEN_PIN_MESSAGE,
  REVIEW_PICK_MESSAGE,
  REVIEW_PIN_LOCATE_MESSAGE,
  REVIEW_PINS_MESSAGE,
  REVIEW_SELECT_MESSAGE,
  REVIEW_WHEEL_MESSAGE,
  injectReviewBridge,
  markersFromComments,
  placementFromPick,
  REVIEW_BRIDGE_VERSION
} from '../utils/reviewBridge';

interface PrototypeViewerProps {
  project: Project;
  comments: CommentPin[];
  annotations: AnnotationItem[];
  selectedCommentId: string | null;
  onSelectComment: (id: string | null) => void;
  viewportMode: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  onClearAnnotations: () => void;
  onDropPin: (coords: PinPlacement) => void;
  pendingPin: PinPlacement | null;
  onSaveAnnotation: (item: Omit<AnnotationItem, 'id'>) => Promise<void>;
  currentUser: UserProfile;
}

export const PrototypeViewer: React.FC<PrototypeViewerProps> = ({
  project,
  comments,
  annotations,
  selectedCommentId,
  onSelectComment,
  viewportMode,
  onViewportChange,
  zoomLevel,
  onZoomChange,
  activeTool,
  onToolChange,
  onClearAnnotations,
  onDropPin,
  pendingPin,
  onSaveAnnotation,
  currentUser
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const onDropPinRef = useRef(onDropPin);
  onDropPinRef.current = onDropPin;
  const onToolChangeRef = useRef(onToolChange);
  onToolChangeRef.current = onToolChange;
  const onSelectCommentRef = useRef(onSelectComment);
  onSelectCommentRef.current = onSelectComment;
  const selectedCommentIdRef = useRef(selectedCommentId);
  selectedCommentIdRef.current = selectedCommentId;

  // Keyboard shortcut listeners (V for Browse, C for Pin, P for Pencil, R for Rectangle, A for Arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        onToolChange('browse');
      } else if (e.key === 'c' || e.key === 'C') {
        onToolChange('comment');
      } else if (e.key === 'Escape') {
        onToolChange('browse');
      } else if (e.key === 'p' || e.key === 'P') {
        onToolChange('pencil');
      } else if (e.key === 'r' || e.key === 'R') {
        onToolChange('rectangle');
      } else if (e.key === 'a' || e.key === 'A') {
        onToolChange('arrow');
      } else if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onZoomChange(1.0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToolChange, onZoomChange]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<string>('');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  // Viewport width constraints
  const viewportWidths: Record<ViewportMode, string> = {
    desktop: '1280px',
    tablet: '768px',
    mobile: '375px',
    fluid: '100%'
  };

  const [iframeHeight, setIframeHeight] = useState<number>(820);

  const srcDoc = useMemo(
    () => injectReviewBridge(project.htmlContent),
    [project.htmlContent, REVIEW_BRIDGE_VERSION]
  );

  const postReviewMode = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: REVIEW_MODE_MESSAGE, active: activeTool === 'comment' },
      '*'
    );
  }, [activeTool]);

  const postPins = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: REVIEW_PINS_MESSAGE,
        pins: markersFromComments(comments, pendingPin, selectedCommentId)
      },
      '*'
    );
  }, [comments, pendingPin, selectedCommentId]);

  // Sync the iframe height to its content's full document height so the outer
  // canvas handles all scrolling.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let ro: ResizeObserver | null = null;

    const syncHeight = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const h = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
        doc.documentElement?.offsetHeight ?? 0,
        doc.body?.offsetHeight ?? 0,
        820
      );
      setIframeHeight(h);
    };

    const attachObservers = () => {
      syncHeight();
      const doc = iframe.contentDocument;
      if (!doc) return;
      ro?.disconnect();
      ro = new ResizeObserver(syncHeight);
      if (doc.documentElement) ro.observe(doc.documentElement);
      if (doc.body) ro.observe(doc.body);
    };

    iframe.addEventListener('load', attachObservers);
    if (iframe.contentDocument?.readyState === 'complete') {
      attachObservers();
    }

    const timer1 = setTimeout(syncHeight, 50);
    const timer2 = setTimeout(syncHeight, 250);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      iframe.removeEventListener('load', attachObservers);
      ro?.disconnect();
    };
  }, [project.htmlContent, viewportMode, zoomLevel]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      postReviewMode();
      postPins();
      const selectedId = selectedCommentIdRef.current;
      if (selectedId) {
        iframe.contentWindow?.postMessage(
          { type: REVIEW_SELECT_MESSAGE, id: selectedId },
          '*'
        );
      }
    };
    iframe.addEventListener('load', onLoad);
    postReviewMode();
    postPins();
    return () => iframe.removeEventListener('load', onLoad);
  }, [postReviewMode, postPins, srcDoc]);

  useEffect(() => {
    if (!selectedCommentId) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: REVIEW_SELECT_MESSAGE, id: selectedCommentId },
      '*'
    );
  }, [selectedCommentId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === REVIEW_PICK_MESSAGE) {
        const placement = placementFromPick(data.target);
        if (placement) onDropPinRef.current(placement);
        return;
      }
      if (data.type === REVIEW_CANCEL_MESSAGE) {
        onToolChangeRef.current('browse');
        return;
      }
      if (data.type === REVIEW_OPEN_PIN_MESSAGE && typeof data.id === 'string') {
        onSelectCommentRef.current(data.id);
        return;
      }
      if (data.type === REVIEW_WHEEL_MESSAGE) {
        const canvas = document.getElementById('prototype-viewport-canvas');
        canvas?.scrollBy({
          left: typeof data.deltaX === 'number' ? data.deltaX : 0,
          top: typeof data.deltaY === 'number' ? data.deltaY : 0
        });
        return;
      }
      if (data.type === REVIEW_PIN_LOCATE_MESSAGE && typeof data.y === 'number') {
        const canvas = document.getElementById('prototype-viewport-canvas');
        if (!canvas) return;
        const iframeRect = iframe.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const height = iframe.clientHeight || 1;
        const visualY = iframeRect.top + (data.y / height) * iframeRect.height;
        canvas.scrollBy({
          top: visualY - (canvasRect.top + canvas.clientHeight / 2),
          behavior: 'smooth'
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Drawing mouse handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!['pencil', 'rectangle', 'arrow'].includes(activeTool)) return;

    const rect = svgOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });

    if (activeTool === 'pencil') {
      setDrawPath(`M ${x} ${y}`);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPoint) return;

    const rect = svgOverlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPoint({ x, y });

    if (activeTool === 'pencil') {
      setDrawPath((prev) => `${prev} L ${x} ${y}`);
    }
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !startPoint || !currentPoint) {
      setIsDrawing(false);
      return;
    }

    let finalPoints = '';
    if (activeTool === 'pencil' && drawPath) {
      finalPoints = drawPath;
    } else if (activeTool === 'rectangle') {
      const minX = Math.min(startPoint.x, currentPoint.x);
      const minY = Math.min(startPoint.y, currentPoint.y);
      const w = Math.abs(currentPoint.x - startPoint.x);
      const h = Math.abs(currentPoint.y - startPoint.y);
      if (w > 5 && h > 5) {
        finalPoints = `${minX},${minY},${w},${h}`;
      }
    } else if (activeTool === 'arrow') {
      const dist = Math.hypot(currentPoint.x - startPoint.x, currentPoint.y - startPoint.y);
      if (dist > 10) {
        finalPoints = `${startPoint.x},${startPoint.y},${currentPoint.x},${currentPoint.y}`;
      }
    }

    if (finalPoints) {
      await onSaveAnnotation({
        projectId: project.id,
        authorId: currentUser.id,
        authorName: currentUser.name,
        type: activeTool as 'pencil' | 'rectangle' | 'arrow',
        points: finalPoints,
        color: '#ef4444',
        strokeWidth: 3,
        createdAt: new Date().toISOString()
      });
    }

    setIsDrawing(false);
    setDrawPath('');
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const isDrawingTool = ['pencil', 'rectangle', 'arrow'].includes(activeTool);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Canvas Review Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={onToolChange}
        onClearAnnotations={onClearAnnotations}
        annotationCount={annotations.length}
        viewportMode={viewportMode}
        onViewportChange={onViewportChange}
        zoomLevel={zoomLevel}
        onZoomChange={onZoomChange}
      />

      {/* Prototype Canvas Viewport */}
      <div 
        id="prototype-viewport-canvas"
        className="flex-1 overflow-auto bg-slate-100/90 flex flex-col items-center justify-start p-6 relative select-none"
      >
      {/* Device Frame Wrapper */}
      <div
        className="transition-all duration-200 ease-out origin-top shadow-xl rounded-xl bg-white border border-slate-300/80 flex flex-col"
        style={{
          width: viewportWidths[viewportMode],
          maxWidth: '100%',
          transform: `scale(${zoomLevel})`,
          minHeight: '850px'
        }}
      >
        {/* Device Header Bar */}
        <div className="h-7 bg-slate-100 border-b border-slate-200 px-3 flex items-center justify-between rounded-t-xl text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[10px] text-slate-400 ml-2 truncate max-w-[200px]">
              {project.originalFileName || 'prototype.html'}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span>{viewportWidths[viewportMode]}</span>
            {activeTool !== 'browse' && (
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded capitalize">
                Tool: {activeTool}
              </span>
            )}
          </div>
        </div>

        {/* Comment Mode Active Guidance Banner */}
        {activeTool === 'comment' && !pendingPin && (
          <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-xs font-medium shadow-inner animate-in fade-in slide-in-from-top-1 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse shrink-0" />
              <span className="font-bold">Comment Mode:</span>
              <span className="text-indigo-100 truncate">Click a part of the page — the highlight is on the element, not a layer above it</span>
            </div>
            <button
              onClick={() => onToolChange('browse')}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 ml-2"
              title="Return to browsing prototype (Esc)"
            >
              <X className="w-3 h-3" />
              <span>Back to Browse (Esc)</span>
            </button>
          </div>
        )}

        {/* Prototype Screen & Interactive Canvas */}
        <div
          ref={containerRef}
          className={`relative w-full rounded-b-xl ${
            activeTool === 'comment'
              ? 'cursor-crosshair'
              : isDrawingTool
              ? 'cursor-cell'
              : 'cursor-default'
          }`}
          style={{ height: iframeHeight }}
        >
          {/* Sandboxed HTML Prototype Iframe */}
          <iframe
            ref={iframeRef}
            title={project.title}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
            className="w-full border-none block bg-white"
            style={{ height: iframeHeight }}
          />

          {/* SVG Visual Annotations (Drawings, Rectangles, Arrows) */}
          <svg
            ref={svgOverlayRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`absolute inset-0 w-full h-full z-25 ${
              isDrawingTool ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
            </defs>

            {/* Render Saved Annotations */}
            {annotations.map((ann) => {
              if (ann.type === 'pencil') {
                return (
                  <path
                    key={ann.id}
                    d={ann.points}
                    fill="none"
                    stroke={ann.color || '#ef4444'}
                    strokeWidth={ann.strokeWidth || 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              if (ann.type === 'rectangle') {
                const [x, y, w, h] = ann.points.split(',').map(Number);
                return (
                  <rect
                    key={ann.id}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="rgba(239, 68, 68, 0.12)"
                    stroke={ann.color || '#ef4444'}
                    strokeWidth={ann.strokeWidth || 2}
                    strokeDasharray="4 2"
                    rx="4"
                  />
                );
              }
              if (ann.type === 'arrow') {
                const [x1, y1, x2, y2] = ann.points.split(',').map(Number);
                return (
                  <line
                    key={ann.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={ann.color || '#ef4444'}
                    strokeWidth={ann.strokeWidth || 3}
                    markerEnd="url(#arrowhead)"
                  />
                );
              }
              return null;
            })}

            {/* Render Current Active Drawing */}
            {isDrawing && activeTool === 'pencil' && drawPath && (
              <path
                d={drawPath}
                fill="none"
                stroke="#ef4444"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {isDrawing && activeTool === 'rectangle' && startPoint && currentPoint && (
              <rect
                x={Math.min(startPoint.x, currentPoint.x)}
                y={Math.min(startPoint.y, currentPoint.y)}
                width={Math.abs(currentPoint.x - startPoint.x)}
                height={Math.abs(currentPoint.y - startPoint.y)}
                fill="rgba(239, 68, 68, 0.15)"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="4 2"
                rx="4"
              />
            )}

            {isDrawing && activeTool === 'arrow' && startPoint && currentPoint && (
              <line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={currentPoint.x}
                y2={currentPoint.y}
                stroke="#ef4444"
                strokeWidth={3}
                markerEnd="url(#arrowhead)"
              />
            )}
          </svg>
        </div>
      </div>
      </div>

      {/* Bottom Mode Bar — docked below viewport, never overlaps prototype */}
      <div
        id="review-mode-dock"
        className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border-t border-slate-200/80 shadow-inner z-20"
      >
        {/* Browse Mode */}
        <button
          id="dock-browse-btn"
          onClick={() => onToolChange('browse')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'browse'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Browse & interact directly with prototype elements (V)"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Browse & Test</span>
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTool === 'browse' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>V</kbd>
        </button>

        {/* Pin Comment Mode */}
        <button
          id="dock-comment-btn"
          onClick={() => onToolChange(activeTool === 'comment' ? 'browse' : 'comment')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'comment'
              ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-300'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Click an element to attach a pin that stays in place (C)"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>{activeTool === 'comment' ? 'Placing Pin…' : 'Add Comment'}</span>
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTool === 'comment' ? 'bg-amber-500/80 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>C</kbd>
        </button>

        {activeTool === 'comment' && (
          <button
            id="dock-cancel-btn"
            onClick={() => onToolChange('browse')}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
            title="Cancel and return to Browse (Esc)"
          >
            Cancel (Esc)
          </button>
        )}
      </div>
    </div>
  );
};
