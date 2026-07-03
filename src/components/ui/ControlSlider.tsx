import { Component } from 'solid-js';
import { Slider } from '@kobalte/core';

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export const ControlSlider: Component<ControlSliderProps> = (props) => {
  return (
    <Slider.Root
      class="flex items-center w-full gap-3 py-1"
      value={[props.value]}
      minValue={props.min}
      maxValue={props.max}
      step={props.step}
      onChange={(val) => props.onChange(val[0])}
    >
      <div class="w-20 shrink-0">
        <Slider.Label class="text-[12px] text-primary capitalize">
          {props.label}
        </Slider.Label>
      </div>
      
      <Slider.Track class="relative flex-1 h-1 bg-border rounded-full">
        {/* Changed bg-accent to bg-primary for a monochromatic aesthetic */}
        <Slider.Fill class="absolute h-full bg-primary rounded-full" />
        <Slider.Thumb class="block w-2.5 h-2.5 -mt-[3px] bg-white rounded-full cursor-pointer hover:scale-110 transition-transform focus:outline-none" />
      </Slider.Track>
      
      <input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(e) => props.onChange(parseFloat(e.currentTarget.value))}
        class="w-12 bg-input text-primary text-[12px] text-center rounded border border-border outline-none focus:border-primary shrink-0 py-0.5 m-0"
      />
    </Slider.Root>
  );
};
