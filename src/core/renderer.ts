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
  
  // State for Uniforms (16 floats = 64 bytes)
  private uniformsData = new Float32Array(16);
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
    // 64 bytes: 16 floats to hold all slider values and aspect ratios
    this.uniformBuffer = this.device.createBuffer({
      size: 64, 
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    this.texture = this.device.createTexture({
      size: [1, 1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    
    this.device.queue.writeTexture(
      { texture: this.texture },
      new Uint8Array([25, 25, 25, 255]),
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

  // Accept all settings at once
  public updateSettings(settings: any) {
    this.uniformsData[0] = settings.exposure;
    this.uniformsData[1] = settings.contrast;
    this.uniformsData[2] = settings.temperature;
    this.uniformsData[3] = settings.tint;
    this.uniformsData[4] = settings.saturation;
    this.uniformsData[5] = settings.vibrance;
    // Slots 6-10 reserved for highlights/shadows/etc later
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
    
    // Pack layout-dependent variables at the end
    this.uniformsData[11] = this.imageAspect;
    this.uniformsData[12] = this.canvasAspect;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformsData);
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
