import { Component, onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import { WebGPURenderer } from '../../core/renderer';
import { settings } from '../../store/settings';

export const Canvas: Component = () => {
  let canvasRef!: HTMLCanvasElement;
  let containerRef!: HTMLElement;
  let renderer: WebGPURenderer;
  let resizeObserver: ResizeObserver;
  
  // Explicitly track when WebGPU has finished async setup
  const [isGpuReady, setIsGpuReady] = createSignal(false);

  onMount(async () => {
    try {
      renderer = new WebGPURenderer(canvasRef);
      await renderer.init();
      
      setIsGpuReady(true); // Unlock UI binding

      resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          renderer.resize(width, height);
        }
      });
      resizeObserver.observe(containerRef);
    } catch (error) {
      console.error("Renderer Initialization Failed:", error);
    }
  });

  // This will now perfectly track settings changes and fire accurately
  createEffect(() => {
    if (isGpuReady()) {
      renderer.updateSettings(
        settings.exposure,
        settings.contrast,
        settings.temperature,
        settings.tint
      );
    }
  });

  onCleanup(() => {
    if (resizeObserver) resizeObserver.disconnect();
  });

  return (
    <main 
      ref={containerRef} 
      class="flex-1 bg-canvas flex items-center justify-center relative overflow-hidden"
    >
      <canvas 
        ref={canvasRef} 
        class="w-full h-full block"
        style={{ "touch-action": "none" }}
      />
    </main>
  );
};
