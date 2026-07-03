import { Component } from 'solid-js';

export const BottomBar: Component = () => {
  return (
    <footer class="h-28 bg-panel border-t border-border flex items-center px-4 shrink-0 overflow-x-auto">
      <div class="text-[12px] text-icon flex items-center h-full w-full justify-center border-dashed border border-border rounded">
        Image Timeline / Horizontal Scroll
      </div>
    </footer>
  );
};
