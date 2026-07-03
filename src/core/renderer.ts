import { basicShader } from './shaders';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private pipeline!: GPURenderPipeline;
  
  private uniformBuffer!: GPUBuffer;
  private sampler!: GPUSampler;
  private texture!: GPUTexture;
  private bindGroup!: GPUBindGroup;
  
  public initialized: boolean = false;
  private renderPending: boolean = false;
  
  // State for Uniforms
  private currentSettings = new Float32Array([0, 0, 5500, 0]);
  private imageAspect: number = 1.0;
  private canvasAspect: number = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    if (!navigator.gpu) throw new Error("WebGPU is not supported.");
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) throw new Error("No appropriate GPUAdapter found.");

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: "premultiplied" });

    this.setupResources();
    this.setupPipeline();
    this.initialized = true;
    this.scheduleRender();
  }

  private setupResources() {
    // 32 bytes: 8 floats (exposure, contrast, temp, tint, imgAspect, canAspect, pad1, pad2)
    this.uniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    // Create a 1x1 default texture (Canvas BG color) before an image is loaded
    this.texture = this.device.createTexture({
      size: [1, 1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    
    this.device.queue.writeTexture(
      { texture: this.texture },
      new Uint8Array([25, 25, 25, 255]), // #191919
      { bytesPerRow: 4 },
      [1, 1, 1]
    );
  }

  private setupPipeline() {
    const shaderModule = this.device.createShaderModule({
      code: basicShader,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.updateBindGroup();
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
  }

  public setImage(bitmap: ImageBitmap) {
    if (!this.initialized) return;

    // Destroy old texture to free VRAM
    if (this.texture) this.texture.destroy();

    this.texture = this.device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture: this.texture },
      [bitmap.width, bitmap.height]
    );

    this.imageAspect = bitmap.width / bitmap.height;
    this.updateBindGroup();
    this.updateUniforms();
  }

  public updateSettings(exposure: number, contrast: number, temp: number, tint: number) {
    this.currentSettings[0] = exposure;
    this.currentSettings[1] = contrast;
    this.currentSettings[2] = temp;
    this.currentSettings[3] = tint;
    this.updateUniforms();
  }

  public resize(width: number, height: number) {
    if (!this.initialized) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, width * dpr);
    this.canvas.height = Math.max(1, height * dpr);
    this.canvasAspect = this.canvas.width / this.canvas.height;
    this.updateUniforms();
  }

  private updateUniforms() {
    if (!this.initialized) return;
    const uniformsData = new Float32Array([
      this.currentSettings[0], this.currentSettings[1], this.currentSettings[2], this.currentSettings[3],
      this.imageAspect, this.canvasAspect, 0, 0
    ]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformsData);
    this.scheduleRender();
  }

  private scheduleRender() {
    if (!this.renderPending) {
      this.renderPending = true;
      requestAnimationFrame(() => { this.render(); this.renderPending = false; });
    }
  }

  private render() {
    if (!this.initialized || !this.pipeline || !this.bindGroup) return;

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.098, g: 0.098, b: 0.098, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(3); 
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
