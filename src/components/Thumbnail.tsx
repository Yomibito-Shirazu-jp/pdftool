import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';
import { Annotation } from '../types';

interface ThumbnailProps {
  pdfDoc: pdfjs.PDFDocumentProxy;
  pageNum: number;
  currentPage: number;
  onClick: () => void;
  hasAiAnnotations: boolean;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({ 
  pdfDoc, 
  pageNum, 
  currentPage, 
  onClick,
  hasAiAnnotations
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const renderThumbnail = async () => {
      if (!pdfDoc || !canvasRef.current || isRendering) return;
      
      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.2 }); // Small scale for thumbnails
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context || !isMounted) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering thumbnail:', err);
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    renderThumbnail();
    return () => { isMounted = false; };
  }, [pdfDoc, pageNum]);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "cursor-pointer group relative transition-all duration-200",
        currentPage === pageNum ? "ring-2 ring-[#E5322E] ring-offset-2 rounded" : "hover:ring-1 hover:ring-[#D1D1D1] hover:ring-offset-1"
      )}
    >
      <div className="w-full aspect-[1/1.414] bg-white border border-[#D1D1D1] shadow-sm rounded flex items-center justify-center text-[#999] text-[10px] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        {isRendering && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#E5322E] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {hasAiAnnotations && (
        <div className="absolute top-1 left-1 bg-[#E5322E] text-white p-0.5 rounded shadow-sm">
          <Sparkles size={8} />
        </div>
      )}
      <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1 rounded">{pageNum}</div>
    </div>
  );
};
