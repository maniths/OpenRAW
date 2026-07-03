import { Component } from 'solid-js';
import { Collapsible } from '@kobalte/core';
import { ControlSlider } from '../ui/ControlSlider';
import { settings, setSettings } from '../../store/settings';

export const BasicsPanel: Component = () => {
  return (
    <Collapsible.Root class="border-b border-border" defaultOpen={true}>
      <Collapsible.Trigger class="w-full flex items-center justify-between p-3 bg-panel hover:text-accent transition-colors cursor-pointer outline-none">
        <span class="text-[14px] text-primary capitalize font-medium">Basics</span>
        <span class="text-[12px] text-icon">▼</span>
      </Collapsible.Trigger>
      
      <Collapsible.Content class="px-3 pb-4 space-y-4">
        {/* White Balance Section */}
        <div class="space-y-1">
          <div class="text-[10px] uppercase text-icon mb-2 tracking-wider">White Balance</div>
          <select class="w-full bg-input text-primary text-[12px] border border-border rounded px-2 py-1 mb-2 outline-none focus:border-accent">
            <option>As Shot</option>
            <option>Auto</option>
            <option>Daylight</option>
            <option>Cloudy</option>
            <option>Shade</option>
          </select>
          <ControlSlider label="Temp" value={settings.temperature} min={2000} max={50000} step={50} onChange={(v) => setSettings('temperature', v)} />
          <ControlSlider label="Tint" value={settings.tint} min={-150} max={150} step={1} onChange={(v) => setSettings('tint', v)} />
        </div>

        <div class="h-px bg-border w-full my-2"></div>

        {/* Tone Section */}
        <div class="space-y-1">
          <div class="text-[10px] uppercase text-icon mb-2 tracking-wider">Tone</div>
          <ControlSlider label="Exposure" value={settings.exposure} min={-5} max={5} step={0.05} onChange={(v) => setSettings('exposure', v)} />
          <ControlSlider label="Contrast" value={settings.contrast} min={-100} max={100} step={1} onChange={(v) => setSettings('contrast', v)} />
          <ControlSlider label="Highlights" value={settings.highlights} min={-100} max={100} step={1} onChange={(v) => setSettings('highlights', v)} />
          <ControlSlider label="Shadows" value={settings.shadows} min={-100} max={100} step={1} onChange={(v) => setSettings('shadows', v)} />
          <ControlSlider label="Whites" value={settings.whites} min={-100} max={100} step={1} onChange={(v) => setSettings('whites', v)} />
          <ControlSlider label="Blacks" value={settings.blacks} min={-100} max={100} step={1} onChange={(v) => setSettings('blacks', v)} />
        </div>

        <div class="h-px bg-border w-full my-2"></div>

        {/* Presence Section */}
        <div class="space-y-1">
          <div class="text-[10px] uppercase text-icon mb-2 tracking-wider">Presence</div>
          <ControlSlider label="Brightness" value={settings.brightness} min={-100} max={100} step={1} onChange={(v) => setSettings('brightness', v)} />
          <ControlSlider label="Texture" value={settings.texture} min={-100} max={100} step={1} onChange={(v) => setSettings('texture', v)} />
          <ControlSlider label="Clarity" value={settings.clarity} min={-100} max={100} step={1} onChange={(v) => setSettings('clarity', v)} />
          <ControlSlider label="Dehaze" value={settings.dehaze} min={-100} max={100} step={1} onChange={(v) => setSettings('dehaze', v)} />
          <ControlSlider label="Saturation" value={settings.saturation} min={-100} max={100} step={1} onChange={(v) => setSettings('saturation', v)} />
          <ControlSlider label="Vibrance" value={settings.vibrance} min={-100} max={100} step={1} onChange={(v) => setSettings('vibrance', v)} />
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
