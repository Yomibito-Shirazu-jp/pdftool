import React from 'react';
import { MousePointer2, Hand, Type, Square, Circle, Sparkles, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Tool } from '../types';

interface ToolPaletteProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  detectTextAI: () => void;
  detectTextStandard: () => void;
  detectTextVision: () => void;
  isDetecting: boolean;
  currentColor: string;
  currentFontSize: number;
  showBackground: boolean;
  setShowBackground: (show: boolean) => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  setActiveTool,
  detectTextAI,
  detectTextStandard,
  detectTextVision,
  isDetecting,
  currentColor,
  currentFontSize,
  showBackground,
  setShowBackground
}) => {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md shadow-2xl border border-[#D2D2D7] rounded-2xl px-4 py-2 flex items-center gap-4 z-40 transition-all hover:shadow-red-500/5">
      <div className="flex items-center gap-1.5">
        <ToolButton icon={<MousePointer2 size={15} />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} label="選択" />
        <ToolButton icon={<Hand size={15} />} active={activeTool === 'hand'} onClick={() => setActiveTool('hand')} label="移動" />
      </div>
      
      <div className="w-[1px] h-5 bg-[#D2D2D7]" />
      
      <div className="flex items-center gap-1.5">
        <ToolButton icon={<Type size={15} />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} label="テキスト" />
        <ToolButton icon={<Square size={15} />} active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} label="矩形" />
        <ToolButton icon={<Circle size={15} />} active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} label="円形" />
      </div>
      
      <div className="w-[1px] h-5 bg-[#D2D2D7]" />
      
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => {
            if (isDetecting) return;
            setActiveTool('edit');
            detectTextStandard();
          }}
          disabled={isDetecting}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all font-bold text-[11px] tracking-tight pro-button",
            activeTool === 'edit' 
              ? "bg-[#1D1D1F] text-white shadow-lg" 
              : "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#1D1D1F]/10",
            isDetecting && "opacity-80 cursor-wait"
          )}
        >
          <MousePointer2 size={14} />
          <span>原本抽出</span>
        </button>

        <button 
          onClick={() => {
            if (isDetecting) return;
            setActiveTool('edit');
            detectTextVision();
          }}
          disabled={isDetecting}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all font-bold text-[11px] tracking-tight pro-button",
            activeTool === 'edit' 
              ? "bg-[#1D1D1F] text-white shadow-lg" 
              : "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#1D1D1F]/10",
            isDetecting && "opacity-80 cursor-wait"
          )}
        >
          <Eye size={14} />
          <span>Vision API</span>
        </button>

        <button 
          onClick={() => {
            if (isDetecting) return;
            setActiveTool('edit');
            detectTextAI();
          }}
          disabled={isDetecting}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all font-bold text-[11px] tracking-tight pro-button relative overflow-hidden",
            activeTool === 'edit' 
              ? "bg-[#E5322E] text-white shadow-lg shadow-red-500/20" 
              : "bg-[#F5F5F7] text-[#E5322E] hover:bg-[#E5322E]/10",
            isDetecting && "opacity-80 cursor-wait"
          )}
        >
        {isDetecting && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        )}
        <Sparkles size={14} className={cn(activeTool === 'edit' || isDetecting ? "animate-pulse" : "")} />
        <span>{isDetecting ? '解析中...' : 'AIマッピング'}</span>
      </button>
      </div>
      
      <div className="w-[1px] h-5 bg-[#D2D2D7]" />
      
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => setShowBackground(!showBackground)}
          title={showBackground ? "原本を非表示" : "原本を表示"}
          className={cn(
            "p-2 rounded-xl transition-all pro-button",
            !showBackground 
              ? "bg-[#E5322E] text-white shadow-md" 
              : "text-[#666] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
          )}
        >
          {showBackground ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>

      <div className="w-[1px] h-5 bg-[#D2D2D7]" />
      
      <div className="flex items-center gap-3 pl-1">
        <div 
          className="w-5 h-5 rounded-full border-2 border-white shadow-sm cursor-pointer ring-1 ring-[#D2D2D7]" 
          style={{ backgroundColor: currentColor }}
        />
        <div className="flex flex-col -space-y-1">
          <span className="text-[9px] font-bold text-[#999] uppercase tracking-tighter">Size</span>
          <span className="text-[11px] font-mono font-bold text-[#1D1D1F]">{currentFontSize}pt</span>
        </div>
      </div>
    </div>
  );
};

function ToolButton({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      title={label}
      className={cn(
        "p-2 rounded-xl transition-all pro-button",
        active 
          ? "bg-[#1D1D1F] text-white shadow-md" 
          : "text-[#666] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
      )}
    >
      {icon}
    </button>
  );
}
