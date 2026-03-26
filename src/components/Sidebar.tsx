import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Image as ImageIcon, Search, PanelLeftClose } from 'lucide-react';
import { cn } from '../lib/utils';
import { Thumbnail } from './Thumbnail';
import { Annotation } from '../types';
import * as pdfjs from 'pdfjs-dist';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  numPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pdfDoc: pdfjs.PDFDocumentProxy | null;
  annotations: Annotation[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  numPages,
  currentPage,
  setCurrentPage,
  pdfDoc,
  annotations
}) => {
  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <motion.aside 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="bg-white border-r border-[#D2D2D7] flex flex-col overflow-hidden z-10 shadow-sm"
        >
          <div className="h-12 px-4 border-b border-[#D2D2D7] flex items-center justify-between bg-[#F5F5F7]/50">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#666]">ページナビゲーター</span>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="p-1.5 hover:bg-[#F5F5F7] rounded-md transition-all text-[#666] hover:text-[#1D1D1F]"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#F5F5F7]/30">
            {pdfDoc && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} className="space-y-2">
                <Thumbnail 
                  pdfDoc={pdfDoc}
                  pageNum={pageNum}
                  currentPage={currentPage}
                  onClick={() => setCurrentPage(pageNum)}
                  hasAiAnnotations={annotations.some(a => a.page === pageNum && a.type === 'ai-edit')}
                />
                <div className="flex justify-center">
                  <span className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full transition-all",
                    currentPage === pageNum ? "bg-[#E5322E] text-white" : "text-[#999]"
                  )}>
                    PAGE {pageNum}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
