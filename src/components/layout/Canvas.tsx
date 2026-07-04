import { Component, onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import { WebGPURenderer } from '../../core/renderer';
import { settings } from '../../store/settings';
import { pipeline } from '../../core/pipeline';
import { ZoomIn, ZoomOut } from 'lucide-solid';

export const Canvas: Component = () => {
  let canvasRef!: HTMLCanvasElement;
  let viewportRef!: HTMLDivElement;
  let renderer: WebGPURenderer;
  
  let canvasObserver: ResizeObserver;
  let viewportObserver: ResizeObserver;
  
  const [isGpuReady, setIsGpuReady] = createSignal(false);
  const [isImageLoaded, setIsImageLoaded] = createSignal(false);
  const [imgDim, setImgDim] = createSignal({ w: 1, h: 1 });
  const [viewportDim, setViewportDim] = createSignal({ w: 1, h: 1 });

  // Zoom Engine States
  const zoomStops = [0, 50, 70, 100, 200, 400, 800, 1600];
  const [zoomIndex, setZoomIndex] = createSignal(0);
  const [zoomPercent, setZoomPercent] = createSignal(0); // 0 = Fit

  // Drag-to-Pan States
  const [isDragging, setIsDragging] = createSignal(false);
  let startPos = { x: 0, y: 0 };
  let scrollStart = { left: 0, top: 0 };

  onMount(async () => {
    try {
      renderer = new WebGPURenderer(canvasRef);
      await renderer.init();
      setIsGpuReady(true);

      pipeline.onImageLoaded((bitmap) => {
        setImgDim({ w: bitmap.width, h: bitmap.height });
        setIsImageLoaded(true);
        renderer.setImage(bitmap);
      });

      viewportObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setViewportDim({ w: entry.contentRect.width, h: entry.contentRect.height });
        }
      });
      viewportObserver.observe(viewportRef);

      canvasObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          renderer.resize(entry.contentRect.width, entry.contentRect.height);
        }
      });
      canvasObserver.observe(canvasRef);

    } catch (error) {
      console.error("Renderer Initialization Failed:", error);
    }
  });

  createEffect(() => {
    if (isGpuReady()) renderer.updateSettings(settings);
  });

  onCleanup(() => {
    if (canvasObserver) canvasObserver.disconnect();
    if (viewportObserver) viewportObserver.disconnect();
  });

  // --- Zoom Engine Math ---
  const handleSliderChange = (e: Event) => {
    const idx = parseInt((e.target as HTMLInputElement).value);
    setZoomIndex(idx);
    setZoomPercent(zoomStops[idx]);
  };

  const syncSliderToIndex = (percent: number) => {
    if (percent === 0) { setZoomIndex(0); return; }
    let closestIdx = 0, minDiff = Infinity;
    for (let i = 1; i < zoomStops.length; i++) {
      let diff = Math.abs(zoomStops[i] - percent);
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    }
    setZoomIndex(closestIdx);
  };

  const handleZoomIn = () => {
    let current = zoomPercent();
    if (current === 0) current = 100;
    else if (current < 100) current = 100;
    else current += 100;
    if (current > 1600) current = 1600;
    setZoomPercent(current);
    syncSliderToIndex(current);
  };

  const handleZoomOut = () => {
    let current = zoomPercent();
    if (current <= 100) current = 0;
    else current -= 100;
    setZoomPercent(current);
    syncSliderToIndex(current);
  };

  // --- Drag to Pan Events ---
  const onMouseDown = (e: MouseEvent) => {
    if (zoomPercent() === 0 || e.button !== 0) return; // Only allow drag when zoomed and left-clicked
    setIsDragging(true);
    startPos = { x: e.pageX, y: e.pageY };
    scrollStart = { left: viewportRef.scrollLeft, top: viewportRef.scrollTop };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    e.preventDefault(); // Prevents text selection while dragging
    const dx = e.pageX - startPos.x;
    const dy = e.pageY - startPos.y;
    viewportRef.scrollLeft = scrollStart.left - dx;
    viewportRef.scrollTop = scrollStart.top - dy;
  };

  const onMouseUp = () => setIsDragging(false);

  // --- Hardware Scaling Math ---
  const scaledDims = () => {
    const padding = 64; // Removes 32px of viewport space from both sides for the "Fit" calculation
    const maxW = Math.max(1, viewportDim().w - padding);
    const maxH = Math.max(1, viewportDim().h - padding);
    
    const fitScale = Math.min(maxW / imgDim().w, maxH / imgDim().h);
    const fitW = imgDim().w * fitScale;
    const fitH = imgDim().h * fitScale;

    const z = zoomPercent();
    const displayScale = z === 0 ? 1.0 : (z / 100) / fitScale;

    return {
      canvasW: fitW,
      canvasH: fitH,
      wrapperW: fitW * displayScale,
      wrapperH: fitH * displayScale,
      scale: displayScale
    };
  };

  return (
    <main class="flex flex-col flex-1 relative bg-canvas overflow-hidden">
      
      {/* Thin Top Navbar */}
      <div class="h-10 border-b border-border bg-panel flex items-center justify-between px-4 shrink-0 z-20">
        <div class="flex-1"></div>
        <div class="flex items-center gap-3">
          <span class="text-[11px] text-icon font-medium mr-1 w-10 text-right select-none">
            {zoomPercent() === 0 ? "Fit" : `${zoomPercent()}%`}
          </span>
          <button class="text-icon hover:text-primary transition-colors focus:outline-none" onClick={handleZoomOut}>
            <ZoomOut size={16}/>
          </button>
          <input 
            type="range" 
            min="0" max="7" 
            class="w-32 accent-primary cursor-pointer" 
            value={zoomIndex()} 
            onInput={handleSliderChange} 
          />
          <button class="text-icon hover:text-primary transition-colors focus:outline-none" onClick={handleZoomIn}>
            <ZoomIn size={16}/>
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div 
        ref={viewportRef} 
        class={`flex-1 overflow-auto relative select-none ${zoomPercent() > 0 ? (isDragging() ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Inner container to ensure safe-centering without clipping, and p-8 (32px) padding at edges */}
        <div class="min-w-full min-h-full flex items-center justify-center p-8">
          <div 
            style={{
              width: `${isImageLoaded() ? scaledDims().wrapperW : 0}px`,
              height: `${isImageLoaded() ? scaledDims().wrapperH : 0}px`,
              position: "relative",
              display: isImageLoaded() ? "flex" : "none",
              "align-items": "center",
              "justify-content": "center",
              "flex-shrink": 0
            }}
          >
            {/* Hardware Accelerated Canvas */}
            <canvas 
              ref={canvasRef} 
              class="block shadow-xl origin-center"
              style={{
                width: `${scaledDims().canvasW}px`,
                height: `${scaledDims().canvasH}px`,
                transform: `scale(${scaledDims().scale})`,
                "will-change": "transform"
              }}
            />
          </div>
        </div>
      </div>

      {/* Thin Bottom Navbar */}
      <div class="h-8 border-t border-border bg-panel flex items-center justify-center px-4 shrink-0 z-20">
        <span class="text-[11px] text-icon tracking-wide truncate max-w-[80%]">
          {settings.fileName || "No image loaded"}
        </span>
      </div>

    </main>
  );
};
