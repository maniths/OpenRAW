export const basicShader = `
struct Adjustments {
  exposure: f32,
  contrast: f32,
  temperature: f32,
  tint: f32,
};

@group(0) @binding(0) var<uniform> adjustments: Adjustments;

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
  output.uv = pos[VertexIndex] * 0.5 + 0.5;
  return output;
}

@fragment
fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
  // Base gradient
  var color = vec3<f32>(in.uv.x * 0.3, in.uv.y * 0.5, 0.4);
  
  // Apply Exposure: Standard photographic math (color * 2^exposure)
  color = color * exp2(adjustments.exposure);
  
  // Apply Contrast: Simplified pivot around 0.5 mid-gray
  // Map our UI contrast (-100 to 100) to a reasonable multiplier
  let contrastFactor = (adjustments.contrast / 100.0) + 1.0; 
  color = (color - 0.5) * max(contrastFactor, 0.0) + 0.5;
  
  return vec4<f32>(color, 1.0);
}
`;
