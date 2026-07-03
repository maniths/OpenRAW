import { Component } from 'solid-js';

export const LHSPanel: Component = () => {
  return (
    <aside class="w-64 bg-panel border-r border-border hidden md:flex flex-col shrink-0 h-full overflow-y-auto">
      <div class="p-3 text-[12px] uppercase text-primary font-medium tracking-wider border-b border-border">
        Presets
      </div>
      <div class="p-3 text-[12px] uppercase text-primary font-medium tracking-wider border-b border-border">
        History
      </div>
    </aside>
  );
};
