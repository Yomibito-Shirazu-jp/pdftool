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
          animate={{ width: 220, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="bg-white border-r border-[#D1D1D1] flex flex-col overflow-hidden z-10"
        >
          <div className="p-3 border-b border-[#D1D1D1] flex items-center justify-between">
            <div className="flex gap-2">
              <button className="p-1.5 bg-[#F0F0F0] rounded"><Layers size={14} /></button>
              <button className="p-1.5 hover:bg-[#F0F0F0] rounded"><ImageIcon size={14} /></button>
              <button className="p-1.5 hover:bg-[#F0F0F0] rounded"><Search size={14} /></button>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-[#F0F0F0] rounded"><PanelLeftClose size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F9FA]">
            {pdfDoc && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <Thumbnail 
                key={pageNum}
                pdfDoc={pdfDoc}
                pageNum={pageNum}
                currentPage={currentPage}
                onClick={() => setCurrentPage(pageNum)}
                hasAiAnnotations={annotations.some(a => a.page === pageNum && a.type === 'ai-edit')}
              />
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
