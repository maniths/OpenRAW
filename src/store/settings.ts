import { createStore } from 'solid-js/store';

export interface Settings {
  // Light
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  // Color
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
}

export const defaultSettings: Settings = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 5000,
  tint: 0,
  saturation: 0,
  vibrance: 0,
};

export const [settings, setSettings] = createStore<Settings>(defaultSettings);

export const resetSettings = () => {
  setSettings(defaultSettings);
};
