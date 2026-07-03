import { basicShader } from './shaders';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private pipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;
  public initialized: boolean = false;
  private renderPending: boolean = false; // Prevents command queue flooding

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

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    });

    this.setupPipeline();
    this.initialized = true;
    
    this.scheduleRender();
  }

  private setupPipeline() {
    const shaderModule = this.device.createShaderModule({
      label: 'Basic Shader Module',
      code: basicShader,
    });

    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.pipeline = this.device.createRenderPipeline({
      label: 'Basic Render Pipeline',
      layout: 'auto',
      vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
  }

  public updateSettings(exposure: number, contrast: number, temp: number, tint: number) {
    if (!this.initialized || !this.uniformBuffer) return;
    
    // Log to confirm the GPU is receiving the exact slider values
    console.log(`[WebGPU Update] Exposure: ${exposure}, Contrast: ${contrast}`);
    
    const settingsArray = new Float32Array([exposure, contrast, temp, tint]);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, settingsArray);
    
    this.scheduleRender();
  }

  public resize(width: number, height: number) {
    if (!this.initialized) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, width * dpr);
    this.canvas.height = Math.max(1, height * dpr);
    this.scheduleRender();
  }

  // Wraps render in requestAnimationFrame to sync with browser display refresh
  private scheduleRender() {
    if (!this.renderPending) {
      this.renderPending = true;
      requestAnimationFrame(() => {
        this.render();
        this.renderPending = false;
      });
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
