export const basicShader = `
struct Uniforms {
  exposure: f32, contrast: f32, temperature: f32, tint: f32,
  saturation: f32, vibrance: f32, highlights: f32, shadows: f32,
  uvScaleX: f32, uvScaleY: f32, uvOffsetX: f32, uvOffsetY: f32,
  pad1: f32, pad2: f32, pad3: f32, pad4: f32,
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
  
  var screenUv = pos[VertexIndex] * 0.5 + 0.5;
  screenUv.y = 1.0 - screenUv.y;
  
  output.uv = vec2<f32>(
    screenUv.x * uniforms.uvScaleX + uniforms.uvOffsetX,
    screenUv.y * uniforms.uvScaleY + uniforms.uvOffsetY
  );
  
  return output;
}

const LUMA = vec3<f32>(0.2126, 0.7152, 0.0722);

@fragment
fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
  var color = textureSample(myTexture, mySampler, in.uv).rgb;

  // IMPORTANT FIX: Return a transparent pixel for out of bounds
  // This allows the DOM wrapper's background color (#191919, #FFFFFF, etc.) to show through seamlessly!
  if (in.uv.x < 0.0 || in.uv.x > 1.0 || in.uv.y < 0.0 || in.uv.y > 1.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }
  
  var linearColor = pow(color, vec3<f32>(2.2));
  
  let t = uniforms.temperature;
  var tempOffset: f32;
  if (t < 5000.0) { tempOffset = (t - 5000.0) / 10500.0; } else { tempOffset = (t - 5000.0) / 22500.0; }

  let tint = uniforms.tint;
  var tintOffset: f32;
  if (tint < 0.0) { tintOffset = tint / 150.0; } else { tintOffset = tint / 375.0; }
  
  var wbAdjust = vec3<f32>(1.0 + tempOffset, 1.0 - tintOffset, 1.0 - tempOffset);
  linearColor = linearColor * max(wbAdjust, vec3<f32>(0.0));
  
  linearColor = linearColor * exp2(uniforms.exposure);
  
  let luma = dot(linearColor, LUMA);
  let perceptualLuma = pow(max(luma, 0.0001), 1.0 / 2.2);
  
  let shadowMask = pow(1.0 - clamp(perceptualLuma, 0.0, 1.0), 3.0);
  let highlightMask = pow(clamp(perceptualLuma, 0.0, 1.0), 3.0);
  
  let shadowBoost = exp2((uniforms.shadows / 100.0) * 1.5 * shadowMask);
  
  var hVal = uniforms.highlights;
  if (hVal < 0.0) { hVal = hVal * 0.6; }
  let highlightRollOff = exp2((hVal / 100.0) * 1.5 * highlightMask);
  
  linearColor = linearColor * shadowBoost * highlightRollOff;
  
  let contrastFactor = (uniforms.contrast / 500.0) + 1.0; 
  linearColor = (linearColor - 0.18) * contrastFactor + 0.18;
  
  let satMultiplier = (uniforms.saturation + 100.0) / 100.0;
  var grayscale = vec3<f32>(dot(linearColor, LUMA));
  linearColor = mix(grayscale, linearColor, satMultiplier);

  let maxChannel = max(linearColor.r, max(linearColor.g, linearColor.b));
  let minChannel = min(linearColor.r, min(linearColor.g, linearColor.b));
  let currentSaturation = maxChannel - minChannel; 
  
  let vibMultiplier = uniforms.vibrance / 100.0;
  let vibMask = 1.0 - currentSaturation; 
  
  linearColor = mix(linearColor, mix(grayscale, linearColor, 2.0), vibMultiplier * vibMask);
  
  linearColor = clamp(linearColor, vec3<f32>(0.0), vec3<f32>(1.0));
  color = pow(linearColor, vec3<f32>(1.0 / 2.2));
  
  return vec4<f32>(color, 1.0);
}
`;
