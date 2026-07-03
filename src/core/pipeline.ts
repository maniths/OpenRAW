// Note the "?worker" suffix - this tells Vite to bundle this as a Web Worker
import DecoderWorker from './decoder.worker?worker';

class ImagePipeline {
  private worker: Worker;

  constructor() {
    this.worker = new DecoderWorker();
    
    this.worker.onmessage = (e) => {
      if (e.data.type === 'DECODE_SUCCESS') {
        const { width, height, buffer } = e.data;
        console.log(`[Main Thread] Received ${width}x${height} buffer. Size: ${ (buffer.byteLength / 1024 / 1024).toFixed(2) } MB`);
        
        // Next Step: Send this buffer directly to the WebGPU Texture!
      }
    };
  }

  public loadRawFile(file: File) {
    // Send the file to the worker
    this.worker.postMessage({ file });
  }
}

export const pipeline = new ImagePipeline();
