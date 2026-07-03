import { createStore } from 'solid-js/store';

export const [settings, setSettings] = createStore({
  // White Balance
  temperature: 5500, // Kelvin
  tint: 0,
  
  // Tone
  exposure: 0.0,
  contrast: 0.0,
  highlights: 0.0,
  shadows: 0.0,
  whites: 0.0,
  blacks: 0.0,
  
  // Presence
  brightness: 0.0,
  texture: 0.0,
  clarity: 0.0,
  dehaze: 0.0,
  saturation: 0.0,
  vibrance: 0.0,
});
