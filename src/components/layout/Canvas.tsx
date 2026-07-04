import { Component, onMount, onCleanup, createEffect, createSignal, For } from 'solid-js';
import { WebGPURenderer } from '../../core/renderer';
import { settings } from '../../store/settings';
import { pipeline } from '../../core/pipeline';
import { ZoomIn, ZoomOut } from 'lucide-solid';

const formatFilename = (filename: string | null) => {
  if (!filename) return "No image loaded";
  
  const maxLength = 35; 
  if (filename.length <= maxLength) return filename;
  
  const extIndex = filename.lastIndexOf(".");
  if (extIndex === -1) {
    return filename.substring(0, 25) + "...";
  }
  
  const ext = filename.substring(extIndex);
  const name = filename.substring(0, extIndex);
  
  const startChunk = name.substring(0, 16);
  const endChunk = name.substring(name.length - 5);
  
  return `${startChunk}...${endChunk}${ext}`;
};

export const Canvas: Component = () => {
  let canvasRef!: HTMLCanvasElement;
  let viewportRef!: HTMLDivElement;
  let renderer: WebGPURenderer;
  
  let viewportObserver: ResizeObserver;
  
  const [isGpuReady, setIsGpuReady] = createSignal(false);
  const [isImageLoaded, setIsImageLoaded] = createSignal(false);
  const [fileName, setFileName] = createSignal<string | null>(null);
  
  const [imgDim, setImgDim] = createSignal({ w: 1, h: 1 });
  const [viewportDim, setViewportDim] = createSignal({ w: 1, h: 1 });

  const [zoom, setZoom] = createSignal(0); 
  const [pan, setPan] = createSignal({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = createSignal(false);
  const [canvasBg, setCanvasBg] = createSignal('#191919'); 
  
  let lastMouse = { x: 0, y: 0 };

  const getFitPercent = () => {
    const vW = viewportDim().w, vH = viewportDim().h;
    const iW = imgDim().w, iH = imgDim().h;
    if (vW <= 1 || iW <= 1) return 100;
    return Math.min(vW / iW, vH / iH) * 100; 
  };

  onMount(async () => {
    try {
      renderer = new WebGPURenderer(canvasRef);
      await renderer.init();
      setIsGpuReady(true);

      // Phase 1: Instant Preview
      pipeline.onImageLoaded((bitmap, name) => {
        setImgDim({ w: bitmap.width, h: bitmap.height });
        setFileName(name);
        setIsImageLoaded(true);
        setZoom(0);
        setPan({ x: 0, y: 0 });
        renderer.setImage(bitmap);
      });

      // Phase 2: 32-bit Linear Sensor Data Integration
      pipeline.onRawDataLoaded((width, height, data) => {
        // We do NOT reset zoom or pan here so the transition is seamless to the user
        renderer.setRawData(width, height, data);
      });

      viewportObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          
          const dpr = window.devicePixelRatio || 1;
          
          setViewportDim({ w, h }); 
          renderer.resize(Math.floor(w * dpr), Math.floor(h * dpr)); 
        }
      });
      viewportObserver.observe(viewportRef);

      viewportRef.addEventListener('wheel', handleWheel, { passive: false });

    } catch (error) {
      console.error("Renderer Initialization Failed:", error);
    }
  });

  onCleanup(() => {
    if (viewportObserver) viewportObserver.disconnect();
    if (viewportRef) viewportRef.removeEventListener('wheel', handleWheel);
  });

  createEffect(() => {
    if (!isGpuReady() || !isImageLoaded()) return;
    
    const vW = viewportDim().w, vH = viewportDim().h;
    const iW = imgDim().w, iH = imgDim().h;
    if (vW <= 1 || iW <= 1) return;

    const scale = zoom() === 0 ? getFitPercent() / 100 : zoom() / 100;
    const centerX = vW / 2 + pan().x - (iW * scale) / 2;
    const centerY = vH / 2 + pan().y - (iH * scale) / 2;

    const uvScaleX = vW / (iW * scale);
    const uvScaleY = vH / (iH * scale);
    const uvOffsetX = -centerX / (iW * scale);
    const uvOffsetY = -centerY / (iH * scale);

    renderer.updateTransform(uvScaleX, uvScaleY, uvOffsetX, uvOffsetY);
  });

  createEffect(() => {
    if (isGpuReady()) renderer.updateSettings(settings);
  });

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

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!isImageLoaded()) return;

    const oldScale = zoom() === 0 ? getFitPercent() / 100 : zoom() / 100;
    const zoomFactor = e.ctrlKey ? 0.01 : 0.003; 
    let targetScale = oldScale * (1 - e.deltaY * zoomFactor);

    if (targetScale <= getFitPercent() / 100) {
      setZoom(0); setPan({ x: 0, y: 0 });
      return;
    }
    if (targetScale > 16.0) targetScale = 16.0;

    const rect = viewportRef.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const vW = viewportDim().w, vH = viewportDim().h;
    const iW = imgDim().w, iH = imgDim().h;

    const imageX = (mouseX - (vW / 2 + pan().x - (iW * oldScale) / 2)) / oldScale;
    const imageY = (mouseY - (vH / 2 + pan().y - (iH * oldScale) / 2)) / oldScale;
    const newPx = mouseX - imageX * targetScale - vW / 2 + (iW * targetScale) / 2;
    const newPy = mouseY - imageY * targetScale - vH / 2 + (iH * targetScale) / 2;

    setPan({ x: newPx, y: newPy });
    setZoom(targetScale * 100);
  };

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
      <div class="h-6 min-h-[1.5rem] max-h-[1.5rem] border-b border-border bg-panel flex items-center px-4 shrink-0 z-20">
        <div class="flex-1"></div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-icon font-medium mr-1 w-8 text-right select-none">
            {zoom() === 0 ? "Fit" : `${Math.round(zoom())}%`}
          </span>
          <button class="text-icon hover:text-primary transition-colors focus:outline-none" onClick={handleZoomOut}>
            <ZoomOut size={14}/>
          </button>
          <input 
            type="range" 
            min={getFitPercent()} 
            max="1600" step="1" 
            class="w-24 h-1 bg-border rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" 
            value={zoom() === 0 ? getFitPercent() : zoom()} 
            onInput={handleSliderChange} 
          />
          <button class="text-icon hover:text-primary transition-colors focus:outline-none" onClick={handleZoomIn}>
            <ZoomIn size={14}/>
          </button>
        </div>
      </div>

      <div class="flex-1 flex p-[5px] overflow-hidden box-border transition-colors duration-200" style={{ "background-color": canvasBg() }}>
        <div 
          ref={viewportRef} 
          class={`flex-1 w-full h-full relative overflow-hidden rounded-sm ${isImageLoaded() ? (zoom() === 0 ? 'cursor-default' : (isDragging() ? 'cursor-grabbing' : 'cursor-grab')) : 'cursor-default'}`}
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
      </div>

      <div class="h-6 min-h-[1.5rem] max-h-[1.5rem] border-t border-border bg-panel flex items-center px-4 shrink-0 z-20 box-border">
        <div class="flex-1"></div>
        <div class="flex items-center justify-center flex-1">
          <span class="text-[10px] text-icon tracking-wide select-none">
            {formatFilename(fileName())}
          </span>
        </div>
        <div class="flex-1 flex justify-end items-center gap-1.5">
          <For each={['#191919', '#393939', '#9C9C9C', '#FFFFFF']}>
            {(color) => (
              <button 
                onClick={() => setCanvasBg(color)} 
                class={`w-3 h-3 rounded-sm border ${canvasBg() === color ? 'border-primary ring-1 ring-primary/30' : 'border-black/30 hover:border-black/50'} shadow-sm transition-all focus:outline-none`} 
                style={{ "background-color": color }} 
                title={`Set background to ${color}`}
              />
            )}
          </For>
        </div>
      </div>
    </main>
  );
};
