import { Component } from 'solid-js';
import { TopBar } from './components/layout/TopBar';
import { BottomBar } from './components/layout/BottomBar';
import { LHSPanel } from './components/layout/LHSPanel';
import { RHSPanel } from './components/layout/RHSPanel';
import { Canvas } from './components/layout/Canvas';

const App: Component = () => {
  return (
    <div class="flex flex-col h-screen w-screen overflow-hidden bg-canvas text-primary font-sans">
      <TopBar />
      <div class="flex flex-1 overflow-hidden relative">
        <LHSPanel />
        <Canvas />
        <RHSPanel />
      </div>
      <BottomBar />
    </div>
  );
};

export default App;
