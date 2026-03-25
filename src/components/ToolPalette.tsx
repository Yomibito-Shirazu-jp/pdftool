import React from 'react';
import { MousePointer2, Hand, Type, Square, Circle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tool } from '../types';

interface ToolPaletteProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  detectTextAI: () => void;
  currentColor: string;
  currentFontSize: number;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  setActiveTool,
  detectTextAI,
  currentColor,
  currentFontSize
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg border border-[#D1D1D1] rounded-lg px-3 py-1.5 flex items-center gap-3 z-20">
      <ToolButton icon={<MousePointer2 size={16} />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
      <ToolButton icon={<Hand size={16} />} active={activeTool === 'hand'} onClick={() => setActiveTool('hand')} />
      <div className="w-[1px] h-4 bg-[#D1D1D1]" />
      <ToolButton icon={<Type size={16} />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} />
      <ToolButton icon={<Square size={16} />} active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} />
      <ToolButton icon={<Circle size={16} />} active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} />
      <div className="w-[1px] h-4 bg-[#D1D1D1]" />
      <button 
        onClick={() => {
          setActiveTool('edit');
          detectTextAI();
        }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded transition-all font-bold text-[10px] uppercase tracking-wider",
          activeTool === 'edit' ? "bg-[#E5322E] text-white shadow-sm" : "hover:bg-[#F0F0F0] text-[#E5322E]"
        )}
      >
        <Sparkles size={14} />
        AI Mapping
      </button>
      <div className="w-[1px] h-4 bg-[#D1D1D1]" />
      <div className="flex items-center gap-2">
        <div 
          className="w-4 h-4 rounded-full border border-[#D1D1D1] cursor-pointer" 
          style={{ backgroundColor: currentColor }}
        />
        <span className="text-[10px] font-bold text-[#666]">{currentFontSize}pt</span>
      </div>
    </div>
  );
};

function ToolButton({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-1.5 rounded transition-all",
        active ? "bg-[#E5322E] text-white shadow-sm" : "hover:bg-[#F0F0F0] text-[#666]"
      )}
    >
      {icon}
    </button>
  );
}
