import { Component } from 'solid-js';
import { pipeline } from '../../core/pipeline';

export const TopBar: Component = () => {
  let fileInputRef!: HTMLInputElement;

  const handleImportClick = () => {
    fileInputRef.click();
  };

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      pipeline.loadRawFile(file);
    }
  };

  return (
    <header class="h-10 bg-panel border-b border-border flex items-center px-4 justify-between shrink-0">
      <div class="font-sans text-primary text-sm font-bold tracking-wide">OpenRAW</div>
      
      <div class="text-[12px] text-icon flex gap-4">
        <input 
          type="file" 
          ref={fileInputRef} 
          class="hidden" 
          accept=".cr2,.cr3,.arw,.nef,.raf,.dng,.rw2,.orf,.jpg,.jpeg,.tiff,.png"
          onChange={handleFileChange}
        />
        <button onClick={handleImportClick} class="hover:text-accent transition-colors">Import</button>
        <button class="hover:text-accent transition-colors">Export</button>
      </div>
    </header>
  );
};
