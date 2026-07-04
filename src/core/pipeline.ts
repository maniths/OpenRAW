type PipelineCallback = (bitmap: ImageBitmap, filename: string) => void;

class ImagePipeline {
  private listeners: PipelineCallback[] = [];

  public onImageLoaded(cb: PipelineCallback) {
    this.listeners.push(cb);
  }

  public async loadRawFile(file: File) {
    console.log(`[Pipeline] Loading file: ${file.name}`);
    try {
      // Temporarily using native browser decoding for JPG/PNG testing.
      // We will replace this with our C++/LibRAW WASM worker for actual RAWs later.
      const bitmap = await createImageBitmap(file);
      console.log(`[Pipeline] Decoded: ${bitmap.width}x${bitmap.height}`);
      
      this.listeners.forEach(cb => cb(bitmap, file.name));
    } catch (err) {
      console.error("[Pipeline] Failed to decode image:", err);
    }
  }
}

export const pipeline = new ImagePipeline();
