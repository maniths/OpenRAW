self.onmessage = async (e: MessageEvent) => {
  const { file } = e.data;
  
  try {
    const buffer = await file.arrayBuffer();
    const view = new Uint8Array(buffer);
    
    let jpegs: { start: number, end: number, size: number }[] = [];
    
    for (let i = 0; i < view.length - 2; i++) {
      if (view[i] === 0xFF && view[i+1] === 0xD8 && view[i+2] === 0xFF) {
        let start = i;
        let end = -1;
        let isLossless = false;
        let hasStandardSOF = false;
        
        for (let j = start + 2; j < view.length - 1; j++) {
          if (view[j] === 0xFF) {
            let marker = view[j+1];
            if (marker === 0xD9) { 
              end = j + 2;
              break;
            } else if (marker === 0xC3) { 
              isLossless = true;
            } else if (marker === 0xC0 || marker === 0xC2) { 
              hasStandardSOF = true;
            }
          }
        }
        
        if (end !== -1 && hasStandardSOF && !isLossless) {
          jpegs.push({ start, end, size: end - start });
          i = end; 
        }
      }
    }
    
    if (jpegs.length === 0) {
      throw new Error("No embedded preview found in RAW file.");
    }
    
    jpegs.sort((a, b) => b.size - a.size);
    const largestJpeg = jpegs[0];
    const previewBytes = buffer.slice(largestJpeg.start, largestJpeg.end);
    const blob = new Blob([previewBytes], { type: 'image/jpeg' });
    
    // --- PHASE 1: Instant Preview ---
    // Decodes the image and transfers it to the main thread immediately.
    const bitmapPreview = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    self.postMessage({ type: 'preview', success: true, bitmap: bitmapPreview, filename: file.name }, [bitmapPreview]);

    // --- PHASE 2: 32-bit Linear Float Pipeline (WASM Bridge) ---
    // In production, the C++ WASM module parses the buffer here.
    // For now, we simulate the output by decoding the preview into an OffscreenCanvas
    // and converting it into a true Linear Float32Array to test the GPU pipeline.
    const bitmapForCanvas = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    const offscreen = new OffscreenCanvas(bitmapForCanvas.width, bitmapForCanvas.height);
    const ctx = offscreen.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(bitmapForCanvas, 0, 0);
      const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      const data = imageData.data;

      const floatData = new Float32Array(offscreen.width * offscreen.height * 4);
      
      for (let i = 0; i < data.length; i += 4) {
        // Decode standard sRGB gamma (2.2) to pure Linear Space
        floatData[i]   = Math.pow(data[i] / 255.0, 2.2);
        floatData[i+1] = Math.pow(data[i+1] / 255.0, 2.2);
        floatData[i+2] = Math.pow(data[i+2] / 255.0, 2.2);
        floatData[i+3] = 1.0; // Alpha
      }

      self.postMessage({ 
        type: 'raw-data', 
        success: true, 
        filename: file.name, 
        width: offscreen.width, 
        height: offscreen.height, 
        floatData 
      }, [floatData.buffer]); // Transfer buffer memory efficiently
    }

  } catch (error: any) {
    self.postMessage({ type: 'error', success: false, error: error.message });
  }
};
