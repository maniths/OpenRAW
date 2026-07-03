import { createStore } from 'solid-js/store';

export const [settings, setSettings] = createStore({
  exposure: 0,
  contrast: 0,
  temperature: 5000, // Default for non-RAW images
  tint: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  brightness: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  saturation: 0,
  vibrance: 0,
});
