import { Component, onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import { WebGPURenderer } from '../../core/renderer';
import { settings } from '../../store/settings';
import { pipeline } from '../../core/pipeline';
import { ZoomIn, ZoomOut } from 'lucide-solid';

export const Canvas: Component = () => {
  let canvasRef!: HTMLCanvasElement;
  let viewportRef!: HTMLDivElement;
  let renderer: WebGPURenderer;
  
  let viewportObserver: ResizeObserver;
  
  const [isGpuReady, setIsGpuReady] = createSignal(false);
  const [isImageLoaded, setIsImageLoaded] = createSignal(false);
  const [imgDim, setImgDim] = createSignal({ w: 1, h: 1 });
  const [viewportDim, setViewportDim] = createSignal({ w: 1, h: 1 });

  const [zoom, setZoom] = createSignal(0); // 0 = Fit, Otherwise precise %
  const [pan, setPan] = createSignal({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = createSignal(false);
  let lastMouse = { x: 0, y: 0 };

  // Calculate the exact 5px margin "Fit" percentage dynamically
  const getFitPercent = () => {
    const vW = viewportDim().w, vH = viewportDim().h;
    const iW = imgDim().w, iH = imgDim().h;
    if (vW <= 1 || iW <= 1) return 100;
    return Math.min((vW - 10) / iW, (vH - 10) / iH) * 100; // 5px pad each side = 10px total
  };

  onMount(async () => {
    try {
      renderer = new WebGPURenderer(canvasRef);
      await renderer.init();
      setIsGpuReady(true);

      pipeline.onImageLoaded((bitmap) => {
        setImgDim({ w: bitmap.width, h: bitmap.height });
        setIsImageLoaded(true);
        setZoom(0);
        setPan({ x: 0, y: 0 });
        renderer.setImage(bitmap);
      });

      // The canvas perfectly mirrors the viewport bounds (No scrollbars ever)
      viewportObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          setViewportDim({ w, h });
          renderer.resize(w, h);
        }
      });
      viewportObserver.observe(viewportRef);

      // Bind native wheel for trackpad zoom
      viewportRef.addEventListener('wheel', handleWheel, { passive: false });

    } catch (error) {
      console.error("Renderer Initialization Failed:", error);
    }
  });

  onCleanup(() => {
    if (viewportObserver) viewportObserver.disconnect();
    if (viewportRef) viewportRef.removeEventListener('wheel', handleWheel);
  });

  // --- CORE CAMERA ENGINE (Calculates GPU Uniforms) ---
  createEffect(() => {
    if (!isGpuReady() || !isImageLoaded()) return;
    
    const vW = viewportDim().w, vH = viewportDim().h;
    const iW = imgDim().w, iH = imgDim().h;
    if (vW <= 1 || iW <= 1) return;

    // Apply scale and offsets
    const scale = zoom() === 0 ? getFitPercent() / 100 : zoom() / 100;
    const centerX = vW / 2 + pan().x - (iW * scale) / 2;
    const centerY = vH / 2 + pan().y - (iH * scale) / 2;

    // Convert Screen Space to Normalized Texture UV Space
    const uvScaleX = vW / (iW * scale);
    const uvScaleY = vH / (iH * scale);
    const uvOffsetX = -centerX / (iW * scale);
    const uvOffsetY = -centerY / (iH * scale);

    renderer.updateTransform(uvScaleX, uvScaleY, uvOffsetX, uvOffsetY);
  });

  createEffect(() => {
    if (isGpuReady()) renderer.updateSettings(settings);
  });

  // --- ZOOM BUTTON LOGIC (50% Steps) ---
  const handleZoomIn = () => {
    let current = zoom() === 0 ? getFitPercent() : zoom();
    let next = Math.floor(current / 50) * 50 + 50;
    if (current < 50 && next > 50) next = 50;
    if (next > 1600) next = 1600;
    setZoom(next);
  };

  const handleZoomOut = () => {
    let current = zoom() === 0 ? getFitPercent() : zoom();
    let next = Math.ceil(current / 50) * 50 - 50;
    if (next <= getFitPercent() + 1) {
      setZoom(0); setPan({ x: 0, y: 0 });
    } else {
      setZoom(next);
    }
  };

  const handleSliderChange = (e: Event) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (val <= getFitPercent() + 1) {
      setZoom(0); setPan({ x: 0, y: 0 });
    } else {
      setZoom(val);
    }
  };

  // --- WHEEL TO ZOOM TO CURSOR ---
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!isImageLoaded()) return;

    const oldScale = zoom() === 0 ? getFitPercent() / 100 : zoom() / 100;
    const zoomFactor = e.ctrlKey ? 0.01 : 0.003; // Smooth sensitivity
    let targetScale = oldScale * (1 - e.deltaY * zoomFactor);

    if (targetScale <= getFitPercent() / 100 + 0.01) {
      setZoom(0); setPan({ x: 0, y: 0 });
      return;
    }
    if (targetScale > 16.0) targetScale = 16.0;

    const rect = viewportRef.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const vW = viewportDim().w, vH = viewportDim().h;
    const iW = imgDim().w, iH = imgDim().h;

    // Keep pixel under cursor locked in place
    const imageX = (mouseX - (vW / 2 + pan().x - (iW * oldScale) / 2)) / oldScale;
    const imageY = (mouseY - (vH / 2 + pan().y - (iH * oldScale) / 2)) / oldScale;
    const newPx = mouseX - imageX * targetScale - vW / 2 + (iW * targetScale) / 2;
    const newPy = mouseY - imageY * targetScale - vH / 2 + (iH * targetScale) / 2;

    setPan({ x: newPx, y: newPy });
    setZoom(targetScale * 100);
  };

  // --- PAN DRAG LOGIC ---
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || zoom() === 0) return;
    setIsDragging(true);
    lastMouse = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };

  const onMouseUp = () => setIsDragging(false);

  return (
    <main class="flex flex-col flex-1 relative bg-canvas overflow-hidden">
      
      {/* Thin Top Navbar */}
      <div class="h-10 border-b border-border bg-panel flex items-center justify-between px-4 shrink-0 z-20">
        <div class="flex-1"></div>
        <div class="flex items-center gap-3">
          <span class="text-[11px] text-icon font-medium mr-1 w-12 text-right select-none">
            {zoom() === 0 ? "Fit" : `${Math.round(zoom())}%`}
          </span>
          <button class="text-icon hover:text-primary transition-colors focus:outline-none" onClick={handleZoomOut}>
            <ZoomOut size={16}/>
          </button>
          {/* Slider automatically dynamically adjusts minimum based on Fit % */}
          <input 
            type="range" 
            min={getFitPercent()} 
            max="1600" step="1" 
            class="w-32 accent-primary cursor-pointer" 
            value={zoom() === 0 ? getFitPercent() : zoom()} 
            onInput={handleSliderChange} 
          />
          <button class="text-icon hover:text-primary transition-colors focus:outline-none" onClick={handleZoomIn}>
            <ZoomIn size={16}/>
          </button>
        </div>
      </div>

      {/* Hardware Camera Viewport (No scrollbars, 100% full stretch) */}
      <div 
        ref={viewportRef} 
        class={`flex-1 relative overflow-hidden bg-canvas ${isImageLoaded() ? (zoom() === 0 ? 'cursor-default' : (isDragging() ? 'cursor-grabbing' : 'cursor-grab')) : 'cursor-default'}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <canvas 
          ref={canvasRef} 
          class="absolute inset-0 w-full h-full block pointer-events-none" 
          style={{ opacity: isImageLoaded() ? 1 : 0 }}
        />
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
