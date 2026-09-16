import React, { useRef, useState, useEffect, useCallback } from 'react';
import { MousePointer, MessageSquarePlus, X, Sparkles } from 'lucide-react';
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
  buildUniqueSelector,
  capturePinAtPoint,
  coordsEqual,
  describeSelector,
  elementAtClientPoint,
  getScrollParent,
  inferElementAnchor,
  listScrollableElements,
  resolvePinPosition,
  setHoverHighlight
} from '../utils/pinAnchor';

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
  const overlayRef = useRef<HTMLDivElement>(null);

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
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [ghostPinPos, setGhostPinPos] = useState<{ x: number; y: number } | null>(null);

  // Viewport width constraints
  const viewportWidths: Record<ViewportMode, string> = {
    desktop: '1280px',
    tablet: '768px',
    mobile: '375px',
    fluid: '100%'
  };

  const [hoveredSelector, setHoveredSelector] = useState<string>('');
  const [pinCoords, setPinCoords] = useState<Record<string, { left: number; top: number }>>({});
  const inferredAnchorsRef = useRef<Record<string, PinPlacement>>({});
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const pendingPinRef = useRef(pendingPin);
  pendingPinRef.current = pendingPin;

  // Highlight the prototype element a pin will attach to
  const prepareHtml = (rawHtml: string): string => {
    const helper = `
      <style id="review-tool-anchor-styles">
        [data-review-anchor-hover="true"] {
          outline: 2px solid #4f46e5 !important;
          outline-offset: 2px;
        }
      </style>
    `;
    if (rawHtml.includes('</head>')) {
      return rawHtml.replace('</head>', `${helper}</head>`);
    }
    if (rawHtml.includes('</body>')) {
      return rawHtml.replace('</body>', `${helper}</body>`);
    }
    return `${rawHtml}${helper}`;
  };

  const placementFor = useCallback(
    (iframe: HTMLIFrameElement, pin: PinPlacement, cacheKey: string): PinPlacement => {
      if (pin.targetSelector) {
        return {
          ...pin,
          anchorX: pin.anchorX ?? 0.5,
          anchorY: pin.anchorY ?? 0.5
        };
      }
      const cached = inferredAnchorsRef.current[cacheKey];
      if (cached) return cached;
      const inferred = inferElementAnchor(iframe, pin);
      if (inferred.targetSelector) {
        inferredAnchorsRef.current[cacheKey] = inferred;
      }
      return inferred;
    },
    []
  );

  const refreshPinCoords = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const next: Record<string, { left: number; top: number }> = {};
    for (const comment of commentsRef.current) {
      next[comment.id] = resolvePinPosition(iframe, placementFor(iframe, comment, comment.id));
    }
    const pending = pendingPinRef.current;
    if (pending) {
      next.__pending = resolvePinPosition(iframe, placementFor(iframe, pending, '__pending'));
    }
    setPinCoords((prev) => (coordsEqual(prev, next) ? prev : next));
  }, [placementFor]);

  useEffect(() => {
    inferredAnchorsRef.current = {};
  }, [project.htmlContent]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let iframeWin: Window | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const scrollables: HTMLElement[] = [];
    let raf = 0;
    let running = false;

    const detach = () => {
      running = false;
      cancelAnimationFrame(raf);
      iframeWin?.removeEventListener('scroll', refreshPinCoords, true);
      iframeWin?.removeEventListener('resize', refreshPinCoords);
      scrollables.forEach((el) => el.removeEventListener('scroll', refreshPinCoords));
      scrollables.length = 0;
      resizeObserver?.disconnect();
      iframeWin = null;
      resizeObserver = null;
    };

    const tick = () => {
      if (!running) return;
      refreshPinCoords();
      raf = requestAnimationFrame(tick);
    };

    const attach = () => {
      detach();
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!win || !doc) return;
      iframeWin = win;
      refreshPinCoords();
      win.addEventListener('scroll', refreshPinCoords, true);
      win.addEventListener('resize', refreshPinCoords);
      listScrollableElements(doc).forEach((el) => {
        el.addEventListener('scroll', refreshPinCoords, { passive: true });
        scrollables.push(el);
      });
      resizeObserver = new ResizeObserver(refreshPinCoords);
      resizeObserver.observe(iframe);
      if (doc.documentElement) resizeObserver.observe(doc.documentElement);
      if (doc.body) resizeObserver.observe(doc.body);
      running = true;
      raf = requestAnimationFrame(tick);
    };

    iframe.addEventListener('load', attach);
    if (iframe.contentDocument?.readyState === 'complete') {
      attach();
    }

    window.addEventListener('resize', refreshPinCoords);
    return () => {
      iframe.removeEventListener('load', attach);
      window.removeEventListener('resize', refreshPinCoords);
      detach();
    };
  }, [refreshPinCoords, project.htmlContent, viewportMode, zoomLevel]);

  useEffect(() => {
    refreshPinCoords();
  }, [refreshPinCoords, comments, pendingPin, viewportMode, zoomLevel]);

  // When a comment is selected in the sidebar, scroll its element into view
  useEffect(() => {
    if (!selectedCommentId) return;
    const iframe = iframeRef.current;
    const comment = commentsRef.current.find((c) => c.id === selectedCommentId);
    const doc = iframe?.contentDocument;
    if (!iframe || !comment || !doc) return;
    const placement = placementFor(iframe, comment, comment.id);
    if (!placement.targetSelector) return;
    try {
      const el = doc.querySelector(placement.targetSelector);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch {
      // Invalid or stale selector — leave the viewport where it is
    }
  }, [selectedCommentId, placementFor]);

  useEffect(() => {
    return () => {
      setHoverHighlight(iframeRef.current?.contentDocument ?? null, null);
    };
  }, [project.htmlContent, activeTool]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'comment') return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const placement = capturePinAtPoint(iframe, e.clientX, e.clientY);
    if (!placement) return;
    setHoverHighlight(iframe.contentDocument, null);
    onDropPin(placement);
  };

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

  const isOverlayActive = activeTool !== 'browse';

  useEffect(() => {
    const node = overlayRef.current;
    if (!node || !isOverlayActive) return;
    const onWheel = (event: WheelEvent) => {
      const iframe = iframeRef.current;
      const win = iframe?.contentWindow;
      const doc = iframe?.contentDocument;
      if (!iframe || !win || !doc) return;
      const underCursor = elementAtClientPoint(iframe, event.clientX, event.clientY);
      const scrollRoot =
        getScrollParent(underCursor) ??
        (doc.scrollingElement instanceof HTMLElement ? doc.scrollingElement : null);
      if (scrollRoot) {
        scrollRoot.scrollBy(event.deltaX, event.deltaY);
      } else {
        win.scrollBy(event.deltaX, event.deltaY);
      }
      event.preventDefault();
      refreshPinCoords();
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [isOverlayActive, refreshPinCoords]);

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
              <span className="text-indigo-100 truncate">Click an element to attach feedback — the pin stays on that element as you scroll or change viewport</span>
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
          className={`relative w-full flex-1 rounded-b-xl overflow-hidden ${
            activeTool === 'comment'
              ? 'cursor-crosshair'
              : ['pencil', 'rectangle', 'arrow'].includes(activeTool)
              ? 'cursor-cell'
              : 'cursor-default'
          }`}
          style={{ minHeight: '820px' }}
        >
          {/* Sandboxed HTML Prototype Iframe */}
          <iframe
            ref={iframeRef}
            title={project.title}
            srcDoc={prepareHtml(project.htmlContent)}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full min-h-[820px] border-none block bg-white"
          />

          {/* Interactive Annotation & Pin Layer (Intercepts clicks when not in 'browse' mode) */}
          {isOverlayActive && (
            <div
              id="interaction-glass-overlay"
              ref={overlayRef}
              onClick={handleOverlayClick}
              onMouseMove={(e) => {
                if (activeTool !== 'comment') return;
                const container = containerRef.current;
                const iframe = iframeRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;
                setGhostPinPos({
                  x: ((e.clientX - rect.left) / rect.width) * container.clientWidth,
                  y: ((e.clientY - rect.top) / rect.height) * container.clientHeight
                });
                if (iframe) {
                  const el = elementAtClientPoint(iframe, e.clientX, e.clientY);
                  setHoveredSelector(el ? describeSelector(buildUniqueSelector(el)) : '');
                  setHoverHighlight(iframe.contentDocument, el);
                }
              }}
              onMouseLeave={() => {
                setGhostPinPos(null);
                setHoveredSelector('');
                setHoverHighlight(iframeRef.current?.contentDocument ?? null, null);
              }}
              className="absolute inset-0 z-20"
            />
          )}

          {/* Floating Ghost Pin on Hover in Comment Mode */}
          {activeTool === 'comment' && ghostPinPos && !pendingPin && (
            <div
              className="absolute pointer-events-none z-35 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
              style={{ left: ghostPinPos.x, top: ghostPinPos.y }}
            >
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xl ring-4 ring-indigo-300 animate-pulse">
                +
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-slate-950/95 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xl border border-white/20 flex items-center gap-1.5 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span>Attach to element</span>
                {hoveredSelector && (
                  <span className="text-slate-400 text-[10px] font-mono border-l border-slate-700 pl-1">
                    {hoveredSelector}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SVG Visual Annotations (Drawings, Rectangles, Arrows) */}
          <svg
            ref={svgOverlayRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`absolute inset-0 w-full h-full z-25 ${
              ['pencil', 'rectangle', 'arrow'].includes(activeTool) ? 'pointer-events-auto' : 'pointer-events-none'
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

          {/* Render Comment Pin Markers */}
          <div className="absolute inset-0 pointer-events-none z-30">
            {comments.map((comment) => {
              const isSelected = selectedCommentId === comment.id;
              const isHovered = hoveredPinId === comment.id;
              const isResolved = comment.status === 'resolved';
              const pos = pinCoords[comment.id];
              const canvasWidth = containerRef.current?.clientWidth ?? 1;
              const canvasHeight = containerRef.current?.clientHeight ?? 1;
              const left = pos?.left ?? (comment.xPercent / 100) * canvasWidth;
              const top = pos?.top ?? (comment.yPercent / 100) * canvasHeight;

              // Smart tooltip placement to prevent clipping against canvas edges
              const isNearTop = top / canvasHeight < 0.22;
              const isNearRight = left / canvasWidth > 0.7;
              const isNearLeft = left / canvasWidth < 0.25;

              const verticalClass = isNearTop ? 'top-full mt-2.5' : 'bottom-full mb-2.5';
              const horizontalClass = isNearRight 
                ? 'right-0' 
                : isNearLeft 
                ? 'left-0' 
                : 'left-1/2 -translate-x-1/2';

              return (
                <div
                  key={comment.id}
                  id={`pin-marker-${comment.pinNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectComment(comment.id);
                  }}
                  onMouseEnter={() => setHoveredPinId(comment.id)}
                  onMouseLeave={() => setHoveredPinId(null)}
                  className="absolute pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 hover:scale-125"
                  style={{
                    left,
                    top
                  }}
                >
                  {/* Pin Circle Badge */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg ring-2 transition-all ${
                      isSelected
                        ? 'ring-indigo-500 scale-115'
                        : isResolved
                        ? 'ring-emerald-300'
                        : 'ring-white'
                    } ${
                      isResolved
                        ? 'bg-emerald-600 text-white'
                        : comment.priority === 'critical'
                        ? 'bg-rose-600 text-white'
                        : comment.priority === 'high'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {comment.pinNumber}
                  </div>

                  {/* Pulsing ring for selected pin */}
                  {isSelected && (
                    <span className="absolute -inset-1 rounded-full bg-indigo-400/40 animate-ping pointer-events-none" />
                  )}

                  {/* Hover Tooltip Preview */}
                  {isHovered && (
                    <div 
                      className={`absolute ${verticalClass} ${horizontalClass} w-64 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-xl p-3 shadow-2xl z-50 pointer-events-none border border-slate-700/90 ring-1 ring-white/10 animate-in fade-in zoom-in-95`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-800">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            #{comment.pinNumber}
                          </span>
                          <span className="font-bold text-xs text-slate-100 truncate">
                            {comment.authorName}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          comment.category === 'bug' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          comment.category === 'design' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          comment.category === 'copy' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {comment.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                        {comment.content}
                      </p>
                      <div className="text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            comment.status === 'resolved' ? 'bg-emerald-400' :
                            comment.status === 'in_progress' ? 'bg-blue-400' : 'bg-amber-400'
                          }`} />
                          {(comment?.status || 'open').replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-slate-400 font-medium">Click pin to open →</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pending Pin Marker (Placed by user, waiting for comment submission) */}
            {pendingPin && (
              <div
                id="pending-pin-marker"
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-35 animate-bounce"
                style={{
                  left:
                    pinCoords.__pending?.left ??
                    (pendingPin.xPercent / 100) * (containerRef.current?.clientWidth ?? 0),
                  top:
                    pinCoords.__pending?.top ??
                    (pendingPin.yPercent / 100) * (containerRef.current?.clientHeight ?? 0)
                }}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xl ring-4 ring-indigo-300">
                  +
                </div>
              </div>
            )}
          </div>
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
