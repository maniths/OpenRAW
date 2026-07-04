import { Settings } from '../store/settings';
import { basicShader } from './shaders';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private uniformBuffer!: GPUBuffer;
  private texture!: GPUTexture;
  private sampler!: GPUSampler;
  private isReady = false;

  private transform = { uvScaleX: 1, uvScaleY: 1, uvOffsetX: 0, uvOffsetY: 0 };
  private currentSettings: Settings | null = null;
  private isRaw: number = 0; // 0 = sRGB (JPEG/PNG), 1 = Linear (RAW)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No appropriate GPUAdapter found.");

    const requiredFeatures: GPUFeatureName[] = [];
    if (adapter.features.has('float32-filterable')) {
      requiredFeatures.push('float32-filterable');
    }

    this.device = await adapter.requestDevice({
      requiredFeatures,
      requiredLimits: {
        maxBufferSize: adapter.limits.maxBufferSize,
        maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
      }
    });

    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;

    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: format,
      alphaMode: 'premultiplied',
    });

    this.uniformBuffer = this.device.createBuffer({
      size: 64, // 16 floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    const shaderModule = this.device.createShaderModule({ code: basicShader });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.isReady = true;
  }

  // Phase 1 / Standard Images
  setImage(bitmap: ImageBitmap) {
    if (!this.isReady) return;
    if (this.texture) this.texture.destroy();

    this.isRaw = 0; 

    this.texture = this.device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: 'rgba16float',
      // MUST have RENDER_ATTACHMENT for copyExternalImageToTexture
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture: this.texture },
      [bitmap.width, bitmap.height]
    );

    this.updateBindGroup();
    this.writeUniforms(); // Force GPU to instantly recognize isRaw = 0
  }

  // Phase 2 / LibRaw 32-bit Output
  setRawData(width: number, height: number, data: Float32Array) {
    if (!this.isReady) return;
    if (this.texture) this.texture.destroy();

    this.isRaw = 1; 

    this.texture = this.device.createTexture({
      size: [width, height, 1],
      format: 'rgba32float', 
      // STRICTLY NO RENDER_ATTACHMENT to prevent 32-bit WebGPU validation crashes
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.device.queue.writeTexture(
      { texture: this.texture },
      data,
      { bytesPerRow: width * 16 }, 
      [width, height, 1]
    );

    this.updateBindGroup();
    this.writeUniforms(); // Force GPU to instantly recognize isRaw = 1
  }

  private updateBindGroup() {
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.texture.createView() },
      ],
    });
    this.render();
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  updateSettings(settings: Settings) {
    this.currentSettings = settings;
    this.writeUniforms();
  }

  updateTransform(uvScaleX: number, uvScaleY: number, uvOffsetX: number, uvOffsetY: number) {
    this.transform = { uvScaleX, uvScaleY, uvOffsetX, uvOffsetY };
    this.writeUniforms();
  }

  private writeUniforms() {
    if (!this.isReady || !this.currentSettings) return;

    const s = this.currentSettings;
    const t = this.transform;

    const uniformData = new Float32Array([
      s.exposure, s.contrast, s.temperature, s.tint,
      s.saturation, s.vibrance, s.highlights, s.shadows,
      s.whites, s.blacks, t.uvScaleX, t.uvScaleY,
      t.uvOffsetX, t.uvOffsetY, this.isRaw, 0 
    ]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
    this.render();
  }

  render() {
    if (!this.isReady || !this.bindGroup) return;

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
