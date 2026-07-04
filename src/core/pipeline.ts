type ImageLoadCallback = (bitmap: ImageBitmap, filename: string) => void;
type RawDataCallback = (width: number, height: number, data: Float32Array) => void;

class Pipeline {
  private callbacks: ImageLoadCallback[] = [];
  private rawCallbacks: RawDataCallback[] = [];
  private worker: Worker | null = null;

  private rawExtensions = [
    'cr3', 'cr2', 'arw', 'nef', 'raf', 'dng', 'rw2', 'orf'
  ];

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    this.worker = new Worker(new URL('./raw-worker.ts', import.meta.url), { type: 'module' });
    
    this.worker.onmessage = (e) => {
      if (e.data.success) {
        if (e.data.type === 'preview') {
          const { bitmap, filename } = e.data;
          console.log(`[PIPELINE] Phase 1: Instant RAW Preview extracted for: ${filename}`);
          this.callbacks.forEach(cb => cb(bitmap, filename));
        } 
        else if (e.data.type === 'raw-data') {
          const { width, height, floatData, filename } = e.data;
          console.log(`[PIPELINE] Phase 2: 32-bit Linear Float Array received for: ${filename}`);
          this.rawCallbacks.forEach(cb => cb(width, height, floatData));
        }
      } else {
        console.error("RAW Worker Failed:", e.data.error);
        alert("Failed to read RAW file preview.");
      }
    };
  }

  onImageLoaded(callback: ImageLoadCallback) {
    this.callbacks.push(callback);
  }

  onRawDataLoaded(callback: RawDataCallback) {
    this.rawCallbacks.push(callback);
  }

  async loadRawFile(file: File) {
    return this.loadImage(file);
  }

  async loadImage(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (this.rawExtensions.includes(ext)) {
      if (this.worker) {
        this.worker.postMessage({ file });
      }
      return;
    }

    try {
      const bitmap = await createImageBitmap(file, { colorSpaceConversion: 'none' });
      this.callbacks.forEach(cb => cb(bitmap, file.name));
    } catch (error) {
      console.error("Failed to decode standard image:", error);
      alert("Failed to read image file.");
    }
  }
}

export const pipeline = new Pipeline();
