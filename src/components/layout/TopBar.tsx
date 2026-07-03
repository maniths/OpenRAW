import { Component } from 'solid-js';
import { pipeline } from '../../core/pipeline';
import { layout, toggleLhs, toggleRhs, toggleBottom } from '../../store/layout';
import { 
  PanelLeftClose, PanelLeftOpen, 
  PanelRightClose, PanelRightOpen, 
  PanelBottomClose, PanelBottomOpen 
} from 'lucide-solid';

export const TopBar: Component = () => {
  let fileInputRef!: HTMLInputElement;

  const handleImportClick = () => fileInputRef.click();

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      pipeline.loadRawFile(target.files[0]);
    }
  };

  return (
    <header class="h-10 bg-panel border-b border-border flex items-center px-4 justify-between shrink-0">
      {/* Logo Area */}
      <div class="flex items-center gap-3">
        <img src="/assets/logo.svg" alt="OpenRAW" class="h-4" />
      </div>
      
      {/* Workspace Toggles */}
      <div class="flex items-center gap-2 text-icon">
        <button onClick={toggleLhs} class="hover:text-primary transition-colors" title="Toggle Left Panel">
          {layout.isLhsOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <button onClick={toggleBottom} class="hover:text-primary transition-colors" title="Toggle Bottom Panel">
          {layout.isBottomOpen ? <PanelBottomClose size={16} /> : <PanelBottomOpen size={16} />}
        </button>
        <button onClick={toggleRhs} class="hover:text-primary transition-colors" title="Toggle Right Panel">
          {layout.isRhsOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>

      {/* Actions */}
      <div class="text-[12px] text-icon flex gap-4">
        <input 
          type="file" 
          ref={fileInputRef} 
          class="hidden" 
          accept=".cr2,.cr3,.arw,.nef,.raf,.dng,.rw2,.orf,.jpg,.jpeg,.tiff,.png"
          onChange={handleFileChange}
        />
        <button onClick={handleImportClick} class="hover:text-primary transition-colors">Import</button>
        <button class="hover:text-primary transition-colors">Export</button>
      </div>
    </header>
  );
};
