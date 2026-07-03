import { Component } from 'solid-js';
import { BasicsPanel } from '../panels/BasicsPanel';

export const RHSPanel: Component = () => {
  return (
    <aside class="w-80 bg-panel border-l border-border flex flex-col shrink-0 h-full overflow-y-auto">
      <div class="h-48 border-b border-border bg-input flex items-center justify-center text-[12px] text-icon sticky top-0 z-10 shrink-0">
        Waveform / Histogram
      </div>
      <div class="flex-1 overflow-y-auto">
        <BasicsPanel />
      </div>
    </aside>
  );
};
