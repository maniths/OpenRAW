import { Component, createSignal, For } from 'solid-js';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-solid';
import { settings, setSettings, defaultSettings, Settings } from '../../store/settings';

const SliderControl: Component<{
  label: string;
  value: number;
  min: number;
  max: number;
  key: keyof Settings;
}> = (props) => {
  const handleDoubleClick = () => {
    setSettings(props.key, defaultSettings[props.key]);
  };

  return (
    <div class="mb-3">
      <div class="flex justify-between items-center mb-1 text-xs">
        <label class="text-text font-medium select-none" onDblClick={handleDoubleClick}>{props.label}</label>
        <input 
          type="number" 
          class="bg-transparent text-right text-text w-12 focus:outline-none focus:text-primary"
          value={props.value}
          onInput={(e) => setSettings(props.key, parseFloat(e.target.value) || 0)}
          onDblClick={handleDoubleClick}
        />
      </div>
      <div class="relative w-full h-1.5 bg-border rounded-full flex items-center">
        <input
          type="range"
          min={props.min}
          max={props.max}
          step="1"
          value={props.value}
          onInput={(e) => setSettings(props.key, parseFloat(e.target.value))}
          onDblClick={handleDoubleClick}
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div 
          class="absolute h-full bg-primary rounded-full pointer-events-none"
          style={{ 
            left: props.min < 0 ? `${Math.min(50, ((props.value - props.min) / (props.max - props.min)) * 100)}%` : '0%',
            width: props.min < 0 ? `${Math.abs(props.value) / (props.max - props.min) * 100}%` : `${((props.value - props.min) / (props.max - props.min)) * 100}%`,
            "transform-origin": props.value < 0 ? 'right' : 'left'
          }}
        />
        <div 
          class="absolute w-2.5 h-2.5 bg-white rounded-full shadow pointer-events-none transform -translate-x-1/2 transition-transform scale-100 peer-active:scale-125"
          style={{ left: `${((props.value - props.min) / (props.max - props.min)) * 100}%` }}
        />
      </div>
    </div>
  );
};

const Section: Component<{ title: string; children: any; defaultOpen?: boolean }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(props.defaultOpen ?? true);

  return (
    <div class="border-b border-border">
      <button 
        class="w-full flex items-center justify-between py-3 px-4 text-sm font-semibold text-text hover:bg-surface transition-colors focus:outline-none"
        onClick={() => setIsOpen(!isOpen())}
      >
        <span>{props.title}</span>
        <span class="text-icon">
          {isOpen() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      <div class="overflow-hidden transition-all duration-300" style={{ "max-height": isOpen() ? '1000px' : '0' }}>
        <div class="px-4 pb-4">
          {props.children}
        </div>
      </div>
    </div>
  );
};

export const Sidebar: Component = () => {
  return (
    <aside class="w-80 bg-panel border-l border-border flex flex-col h-full shrink-0 overflow-y-auto custom-scrollbar">
      <div class="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-panel z-10">
        <h2 class="font-semibold text-text">Adjustments</h2>
        <button 
          onClick={() => setSettings(defaultSettings)}
          class="text-icon hover:text-primary transition-colors"
          title="Reset All Adjustments"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <Section title="Light">
        <SliderControl label="Exposure" key="exposure" value={settings.exposure} min={-4} max={4} />
        <SliderControl label="Contrast" key="contrast" value={settings.contrast} min={-100} max={100} />
        <div class="h-2" />
        <SliderControl label="Highlights" key="highlights" value={settings.highlights} min={-100} max={100} />
        <SliderControl label="Shadows" key="shadows" value={settings.shadows} min={-100} max={100} />
        <div class="h-2" />
        <SliderControl label="Whites" key="whites" value={settings.whites} min={-100} max={100} />
        <SliderControl label="Blacks" key="blacks" value={settings.blacks} min={-100} max={100} />
      </Section>

      <Section title="Color">
        <SliderControl label="Temp" key="temperature" value={settings.temperature} min={2000} max={10000} />
        <SliderControl label="Tint" key="tint" value={settings.tint} min={-100} max={100} />
        <div class="h-2" />
        <SliderControl label="Saturation" key="saturation" value={settings.saturation} min={-100} max={100} />
        <SliderControl label="Vibrance" key="vibrance" value={settings.vibrance} min={-100} max={100} />
      </Section>
    </aside>
  );
};
