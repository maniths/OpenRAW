export const basicShader = `
struct Uniforms {
  exposure: f32,
  contrast: f32,
  temperature: f32,
  tint: f32,
  imageAspect: f32,
  canvasAspect: f32,
  // Padding required by WebGPU to align to 16-byte boundaries
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  
  var output : VertexOutput;
  output.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  
  // Base UV mapping (0 to 1)
  var uv = pos[VertexIndex] * 0.5 + 0.5;
  // Flip Y to match standard image coordinates
  uv.y = 1.0 - uv.y;
  
  // Aspect ratio correction (Fit/Letterbox)
  var scaledUv = uv;
  if (uniforms.canvasAspect > uniforms.imageAspect) {
    let scale = uniforms.imageAspect / uniforms.canvasAspect;
    scaledUv.x = (uv.x - 0.5) / scale + 0.5;
  } else {
    let scale = uniforms.canvasAspect / uniforms.imageAspect;
    scaledUv.y = (uv.y - 0.5) / scale + 0.5;
  }
  
  output.uv = scaledUv;
  return output;
}

@fragment
fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
  // 1. SAMPLE TEXTURE FIRST
  var color = textureSample(myTexture, mySampler, in.uv).rgb;

  // 2. APPLY LETTERBOX BOUNDARIES
  if (in.uv.x < 0.0 || in.uv.x > 1.0 || in.uv.y < 0.0 || in.uv.y > 1.0) {
    return vec4<f32>(0.098, 0.098, 0.098, 1.0); // #191919 background
  }
  
  // 3. COLOR GRADE IN LINEAR SPACE
  // Convert sRGB (JPG/PNG) to Linear space
  var linearColor = pow(color, vec3<f32>(2.2));
  
  // Exposure (Standard EV math)
  linearColor = linearColor * exp2(uniforms.exposure);
  
  // Contrast 
  // Map UI contrast (-50 to 50) to a much subtler multiplier (0.9 to 1.1)
  // By dividing by 500.0, a value of 50 becomes 0.1
  let contrastFactor = (uniforms.contrast / 500.0) + 1.0; 
  
  // Pivot around Photographic Middle Gray (0.18 in linear space)
  linearColor = (linearColor - 0.18) * contrastFactor + 0.18;
  
  // Prevent negative colors before converting back to sRGB
  linearColor = clamp(linearColor, vec3<f32>(0.0), vec3<f32>(1.0));
  
  // Convert back to sRGB for display
  color = pow(linearColor, vec3<f32>(1.0 / 2.2));
  
  return vec4<f32>(color, 1.0);
}
`;
