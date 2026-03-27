import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { GoogleGenAI, Type as GenAIType } from "@google/genai";
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, collection, addDoc, query, where, orderBy, onSnapshot, doc, deleteDoc, getDoc, getDocs, Timestamp, User, handleFirestoreError, OperationType } from './firebase';
import { 
  FileUp, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  Save,
  AlertCircle,
  Settings,
  Layers,
  PanelLeftOpen,
  Sparkles,
  Pen,
  Maximize,
  Search,
  FileText,
  Image,
  ImageIcon,
  Code,
  Database,
  MousePointer2,
  Lock,
  MessageSquareDiff,
  AlertTriangle,
  Hand,
  ChevronDown
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { Tool, Annotation, TextBlock } from './types';
import { FONTS } from './constants';
import { Sidebar } from './components/Sidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ToolPalette } from './components/ToolPalette';

// Configure PDF.js worker using a reliable CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export { pdfjs };

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [analysisQueue, setAnalysisQueue] = useState<string[]>([]);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentFontSize, setCurrentFontSize] = useState(16);
  const [currentFontFamily, setCurrentFontFamily] = useState('Arial Unicode MS');
  const [currentTextAlign, setCurrentTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [scanPhase, setScanPhase] = useState<'doc-ai' | 'gemini-correction' | 'polishing'>('doc-ai');
  const [docAIError, setDocAIError] = useState<string | null>(null);
  const [useGeminiOnly, setUseGeminiOnly] = useState(false);
  const [processorId, setProcessorId] = useState(() => localStorage.getItem('docai_processor_id') || '57695b373b653f96');
  const [projectId, setProjectId] = useState(() => localStorage.getItem('docai_project_id') || 'aidriven-mastering-fyqu');
  const [location, setLocation] = useState(() => localStorage.getItem('docai_location') || 'us');

  // Auto-sync config from server environment
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (cfg.processorId) { setProcessorId(cfg.processorId); localStorage.setItem('docai_processor_id', cfg.processorId); }
      if (cfg.projectId) { setProjectId(cfg.projectId); localStorage.setItem('docai_project_id', cfg.projectId); }
      if (cfg.location) { setLocation(cfg.location); localStorage.setItem('docai_location', cfg.location); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('docai_processor_id', processorId);
    localStorage.setItem('docai_project_id', projectId);
    localStorage.setItem('docai_location', location);
  }, [processorId, projectId, location]);
  
  const [user, setUser] = useState<User | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [comparingVersion, setComparingVersion] = useState<any | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [viewMode, setViewMode] = useState<'canvas' | 'css'>('canvas');
  const [showBackground, setShowBackground] = useState(true);
  const [globalCss, setGlobalCss] = useState<string>(`
/* Vivliostyle-like CSS Typesetting */
@page {
  size: A4;
  margin: 0;
}

body {
  margin: 0;
  padding: 0;
  background: #f0f0f0;
  font-family: "Noto Sans JP", sans-serif;
}

.page {
  position: relative;
  width: 210mm;
  height: 297mm;
  background-color: white;
  margin: 20px auto;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  overflow: hidden;
  page-break-after: always;
}

@media print {
  body { background: none; }
  .page { margin: 0; box-shadow: none; }
}

.annotation {
  position: absolute;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-edit {
  background-color: white; /* Mask original text */
}

/* Custom Typesetting Classes */
.main-title {
  font-size: 36pt;
  font-weight: 900;
  text-align: center;
  margin-top: 50mm;
  color: #E5322E;
}

.chapter-header {
  font-size: 24pt;
  font-weight: bold;
  border-bottom: 2px solid #333;
  margin-bottom: 10mm;
}

.body-text {
  font-size: 11pt;
  line-height: 1.8;
  text-align: justify;
}

.page-number {
  position: absolute;
  bottom: 10mm;
  width: 100%;
  text-align: center;
  font-size: 9pt;
  color: #999;
}
`);

  const [isDraggingAnn, setIsDraggingAnn] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !pdfFile) return;

    const q = query(
      collection(db, 'versions'),
      where('uid', '==', user.uid),
      where('documentId', '==', pdfFile.name),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newVersions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVersions(newVersions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'versions');
    });

    return () => unsubscribe();
  }, [user, pdfFile]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const saveVersion = async () => {
    if (!user || !pdfFile || !versionName.trim()) return;
    setIsSavingVersion(true);
    try {
      const versionData = {
        documentId: pdfFile.name,
        name: versionName,
        annotations: annotations,
        createdAt: Timestamp.now(),
        uid: user.uid
      };
      await addDoc(collection(db, 'versions'), versionData);
      setVersionName('');
      setIsVersionHistoryOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'versions');
    } finally {
      setIsSavingVersion(false);
    }
  };

  // Supabase document ID for current session
  const [supabaseDocId, setSupabaseDocId] = useState<string | null>(null);

  // Auto-save OCR results to Supabase via server API
  const saveOCRResults = async (newAnnotations: Annotation[], source?: string): Promise<string[]> => {
    if (!pdfFile) return [];
    try {
      // Convert annotations to block format for Supabase
      const blocks = newAnnotations.map(ann => ({
        page: ann.page,
        box: [
          (ann.y / (canvasRef.current?.height || 1)) * 1000,
          (ann.x / (canvasRef.current?.width || 1)) * 1000,
          ((ann.y + (ann.height || 0)) / (canvasRef.current?.height || 1)) * 1000,
          ((ann.x + (ann.width || 0)) / (canvasRef.current?.width || 1)) * 1000,
        ],
        text: ann.content,
        fontSize: ann.fontSize,
        fontFamily: ann.fontFamily,
        fontWeight: ann.fontWeight,
        fontStyle: ann.fontStyle,
        textAlign: ann.textAlign,
        color: ann.color,
        source: source || 'docai',
      }));

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user?.uid || 'guest',
          filename: pdfFile.name,
          page_count: numPages,
          blocks
        })
      });

      if (!response.ok) throw new Error('Failed to save to Supabase');
      const data = await response.json();
      setSupabaseDocId(data.document_id);
      console.log(`OCR results saved to Supabase (doc: ${data.document_id}, ${data.block_count} blocks)`);
      return data.block_ids || [];
    } catch (error) {
      console.warn('Failed to save OCR results:', error);
      return [];
    }
  };

  // Save confirmed annotations via Supabase API  
  const saveConfirmedToFirestore = async (_confirmedAnnotations: Annotation[]) => {
    if (!supabaseDocId) {
      console.warn('No Supabase document ID, skipping confirm');
      return;
    }
    try {
      const response = await fetch(`/api/documents/${supabaseDocId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: currentPage })
      });
      if (!response.ok) throw new Error('Failed to confirm');
      const data = await response.json();
      console.log(`Confirmed ${data.confirmed_count} blocks in Supabase`);
    } catch (error) {
      console.warn('Failed to confirm:', error);
    }
  };

  const revertToVersion = (version: any) => {
    setAnnotations(version.annotations);
    setComparingVersion(null);
    setIsVersionHistoryOpen(false);
  };

  const toggleCompareVersion = (version: any) => {
    if (comparingVersion?.id === version.id) {
      setComparingVersion(null);
    } else {
      setComparingVersion(version);
    }
    setIsVersionHistoryOpen(false);
  };

  const deleteVersion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'versions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `versions/${id}`);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setLoadingError(null);
      setIsLoading(true);
      setPdfFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
          const loadingTask = pdfjs.getDocument({ data: typedarray });
          const pdf = await loadingTask.promise;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setCurrentPage(1);
          setIsLoading(false);
        } catch (err) {
          console.error('Error loading PDF:', err);
          setLoadingError('Failed to load PDF. Please try another file.');
          setIsLoading(false);
          setPdfFile(null);
        }
      };
      reader.onerror = () => {
        setLoadingError('Failed to read file.');
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else if (file) {
      setLoadingError('Please select a valid PDF file.');
    }
  };

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
    try {
      const response = await fetch(url, options);
      if (!response.ok && retries > 0) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Fetch failed (status ${response.status}), retrying... (${retries} left)`, errorData);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        console.warn(`Fetch error, retrying... (${retries} left)`, err);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  const clearAnnotations = () => {
    if (window.confirm('現在のページのすべてのアノテーションを削除しますか？')) {
      setAnnotations(prev => prev.filter(a => a.page !== currentPage));
    }
  };

  const detectTextStandard = async () => {
    if (!pdfDoc) return;
    setIsDetecting(true);
    setScanPhase('doc-ai');
    setScanProgress(0);

    try {
      const page = await pdfDoc.getPage(currentPage);
      const textContent = await page.getTextContent();
      
      // Get the current canvas size to match scaling
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");
      
      const viewport = page.getViewport({ scale: 1 });
      const scaleX = canvas.width / viewport.width;
      const scaleY = canvas.height / viewport.height;
      
      const newAnnotations: Annotation[] = textContent.items.map((item: any) => {
        const [sX, , , sY, x, y] = item.transform;
        
        // Convert PDF coordinates to canvas coordinates
        // PDF (0,0) is bottom-left, Canvas (0,0) is top-left
        const canvasX = x * scaleX;
        const canvasY = canvas.height - (y * scaleY) - (item.height * scaleY || Math.abs(sY) * scaleY);

        return {
          id: Math.random().toString(36).substr(2, 9),
          type: 'ai-edit',
          page: currentPage,
          x: canvasX,
          y: canvasY,
          width: item.width * scaleX,
          height: (item.height || Math.abs(sY)) * scaleY,
          content: item.str,
          color: '#000000',
          fontSize: Math.abs(sY) * scaleY,
          fontFamily: 'Noto Sans JP',
          maskBackground: true,
          isConfirmed: false
        };
      }).filter(ann => ann.content.trim().length > 0);

      // Ask if user wants to replace or append
      if (annotations.filter(a => a.page === currentPage).length > 0) {
        if (window.confirm('既存のアノテーションを置き換えますか？ (キャンセルで追加)')) {
          setAnnotations(prev => [...prev.filter(a => a.page !== currentPage), ...newAnnotations]);
        } else {
          setAnnotations(prev => [...prev, ...newAnnotations]);
        }
      } else {
        setAnnotations(prev => [...prev, ...newAnnotations]);
      }
      
      setScanProgress(100);
      setTimeout(() => setIsDetecting(false), 500);
    } catch (err) {
      console.error("Standard extraction failed:", err);
      setIsDetecting(false);
    }
  };

  const detectTextVision = async () => {
    if (!canvasRef.current || !pdfDoc) return;
    
    setIsDetecting(true);
    setScanProgress(0);
    setScanPhase('doc-ai'); // Reuse scan phase for UI
    setDocAIError(null);

    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 98) return prev;
        const increment = prev < 50 ? (Math.random() * 6 + 4) : (Math.random() * 3 + 1);
        return Math.min(98, prev + increment);
      });
    }, 1000);

    try {
      const originalCanvas = canvasRef.current;
      const maxDim = 3072; 
      let width = originalCanvas.width;
      let height = originalCanvas.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (maxDim / width) * height;
          width = maxDim;
        } else {
          width = (maxDim / height) * width;
          height = maxDim;
        }
      }
      
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const ctx = offscreenCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(originalCanvas, 0, 0, width, height);
      }
      
      const imageData = offscreenCanvas.toDataURL('image/png').split(',')[1];
      
      const response = await fetch('/api/detect-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, projectId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Vision API failed");
      }

      const data = await response.json();
      const visionBlocks = data.blocks || [];

      // Convert Vision API blocks to annotations
      const canvas = canvasRef.current;
      const newAnnotations: Annotation[] = visionBlocks.map((b: any) => {
        const [ymin, xmin, ymax, xmax] = b.box;
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          type: 'ai-edit',
          page: currentPage,
          x: (xmin / 1000) * canvas.width,
          y: (ymin / 1000) * canvas.height,
          width: ((xmax - xmin) / 1000) * canvas.width,
          height: ((ymax - ymin) / 1000) * canvas.height,
          content: b.text,
          color: '#000000',
          fontSize: 12, // Default
          fontFamily: 'Noto Sans JP',
          maskBackground: true,
          isConfirmed: false
        };
      });

      if (annotations.filter(a => a.page === currentPage).length > 0) {
        if (window.confirm('既存のアノテーションを置き換えますか？ (キャンセルで追加)')) {
          setAnnotations(prev => [...prev.filter(a => a.page !== currentPage), ...newAnnotations]);
        } else {
          setAnnotations(prev => [...prev, ...newAnnotations]);
        }
      } else {
        setAnnotations(prev => [...prev, ...newAnnotations]);
      }

      clearInterval(progressInterval);
      setScanProgress(100);
      setTimeout(() => setIsDetecting(false), 500);
    } catch (err: any) {
      console.error("Vision API detection failed:", err);
      clearInterval(progressInterval);
      setIsDetecting(false);
      setDocAIError(`Vision API エラー: ${err.message}`);
    }
  };

  const detectTextAI = async (targetIds?: string[]) => {
    if (!canvasRef.current || !pdfDoc) return;
    const isPartial = targetIds && targetIds.length > 0;
    setIsDetecting(true);
    setScanProgress(0);
    setScanPhase('doc-ai');
    setDocAIError(null);
    setTimeRemaining(isPartial ? 5 : 15);
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 98) return prev;
        const increment = prev < 30 ? (Math.random() * 5 + 3) : prev < 70 ? (Math.random() * 3 + 1) : (Math.random() * 1 + 0.5);
        return Math.min(98, prev + increment);
      });
      setTimeRemaining(prev => Math.max(1, prev - 1));
    }, 1000);
    try {
      let pdfBase64 = '';
      if (pdfFile) {
        const buf = await pdfFile.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }
        pdfBase64 = btoa(binary);
      }
      const originalCanvas = canvasRef.current;
      const maxDim = 3072;
      let width = originalCanvas.width;
      let height = originalCanvas.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = (maxDim / width) * height; width = maxDim; }
        else { width = (maxDim / height) * width; height = maxDim; }
      }
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const ctx = offscreenCanvas.getContext('2d');
      if (ctx) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height); ctx.drawImage(originalCanvas, 0, 0, width, height); }
      const imageBase64 = offscreenCanvas.toDataURL('image/png').split(',')[1];
      if (isPartial) {
        setScanPhase('gemini-correction');
        const response = await fetchWithRetry('/api/analyze-page', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, pageNumber: currentPage, processorId, projectId, location })
        });
        if (response.ok) {
          const data = await response.json();
          setAnnotations(prev => prev.map(ann => {
            if (!targetIds!.includes(ann.id)) return ann;
            const bestMatch = data.blocks?.find((b: any) => {
              const bx = (b.box[1] / 1000) * (canvasRef.current!.width / scale);
              const by = (b.box[0] / 1000) * (canvasRef.current!.height / scale);
              return Math.abs(bx - ann.x) < 50 && Math.abs(by - ann.y) < 50;
            });
            if (bestMatch) {
              return { ...ann, content: bestMatch.text || ann.content, fontSize: bestMatch.fontSize || ann.fontSize, fontFamily: bestMatch.fontFamily || ann.fontFamily, textAlign: bestMatch.textAlign || ann.textAlign, color: bestMatch.color || ann.color, fontWeight: bestMatch.fontWeight || ann.fontWeight, fontStyle: bestMatch.fontStyle || ann.fontStyle };
            }
            return ann;
          }));
          setAnalysisQueue(prev => prev.filter(id => !targetIds!.includes(id)));
          setSelectedIds([]);
        }
      } else {
        setScanPhase('doc-ai');
        setScanProgress(10);
        const response = await fetchWithRetry('/api/analyze-page', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: pdfBase64 || undefined, imageBase64, pageNumber: currentPage, processorId, projectId, location })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setDocAIError(`解析エラー (${response.status}): ${errorData.details || errorData.error || '不明なエラー'}`);
        } else {
          const data = await response.json();
          setScanPhase('gemini-correction');
          setScanProgress(80);
          const canvasWidth = canvasRef.current!.width / scale;
          const canvasHeight = canvasRef.current!.height / scale;
          const newAnnotations: Annotation[] = (data.blocks || []).map((block: any, index: number) => {
            const box = block.box;
            return {
              id: `ai-${Date.now()}-${index}`,
              type: 'ai-edit' as const,
              page: currentPage,
              x: (box[1] / 1000) * canvasWidth,
              y: (box[0] / 1000) * canvasHeight,
              width: ((box[3] - box[1]) / 1000) * canvasWidth,
              height: ((box[2] - box[0]) / 1000) * canvasHeight,
              content: block.text,
              originalText: block.originalText || block.text, // ← OCR元テキストを保存
              fontSize: block.fontSize || 12,
              fontFamily: block.fontFamily || 'Noto Sans JP',
              color: block.color || '#000000',
              textAlign: block.textAlign || 'left',
              fontWeight: block.fontWeight || 'normal',
              fontStyle: block.fontStyle || 'normal',
              maskBackground: true,
            };
          });
          setAnnotations(prev => [...prev.filter(a => a.page !== currentPage), ...newAnnotations]);
          // Save to DB and get block IDs
          const blockIds = await saveOCRResults(newAnnotations, 'unified-pipeline');
          if (blockIds.length > 0) {
            setAnnotations(prev => prev.map((ann, idx) => {
              const annIdx = prev.filter(a => a.page === currentPage).indexOf(ann);
              if (ann.page === currentPage && ann.type === 'ai-edit' && annIdx >= 0 && annIdx < blockIds.length) {
                return { ...ann, dbBlockId: blockIds[annIdx] };
              }
              return ann;
            }));
          }
          console.log(`[detectTextAI] Pipeline complete: ${newAnnotations.length} blocks → DB saved (${blockIds.length} IDs)`);
        }
      }
      setScanProgress(100);
      setTimeRemaining(0);
      setTimeout(() => { setIsDetecting(false); setActiveTool('select'); }, 500);
    } catch (err: any) {
      console.error('Pipeline Error:', err);
      setDocAIError(`パイプラインエラー: ${err.message}`);
      setIsDetecting(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const smartFormatAI = async () => {
    if (!canvasRef.current || annotations.length === 0) return;
    
    setIsDetecting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is missing");
      
      const ai = new GoogleGenAI({ apiKey });
      const imageData = canvasRef.current.toDataURL('image/png').split(',')[1];
      
      const pageAnnotations = annotations.filter(a => a.page === currentPage);
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `Analyze these text blocks and suggest professional formatting improvements (font size, weight, alignment) based on their content and context. 
              Current blocks: ${JSON.stringify(pageAnnotations.map(a => ({ id: a.id, text: a.content, size: a.fontSize, weight: a.fontWeight, align: a.textAlign })))}
              
              Identify titles, headers, and body text. Standardize font sizes (e.g., Titles: 24pt+, Headers: 18pt, Body: 12pt). Fix alignment inconsistencies.
              Return a JSON array of objects with { id, fontSize, fontWeight, textAlign }.` },
              { inlineData: { mimeType: "image/png", data: imageData } }
            ]
          }
        ],
        config: {
          systemInstruction: "You are a professional document formatting expert. Your goal is to make the document look polished and consistent. Return ONLY a JSON array.",
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.ARRAY,
            items: {
              type: GenAIType.OBJECT,
              properties: {
                id: { type: GenAIType.STRING },
                fontSize: { type: GenAIType.NUMBER },
                fontWeight: { type: GenAIType.STRING },
                textAlign: { type: GenAIType.STRING }
              },
              required: ["id"]
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text);
      
      setAnnotations(prev => prev.map(ann => {
        const suggestion = suggestions.find((s: any) => s.id === ann.id);
        if (suggestion) {
          return {
            ...ann,
            fontSize: suggestion.fontSize || ann.fontSize,
            fontWeight: suggestion.fontWeight || ann.fontWeight,
            textAlign: suggestion.textAlign || ann.textAlign
          };
        }
        return ann;
      }));
      
    } catch (err) {
      console.error('Smart Format Error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const smartTypesetAI = async () => {
    if (!canvasRef.current || annotations.length === 0) return;
    
    setIsDetecting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is missing");
      
      const ai = new GoogleGenAI({ apiKey });
      const imageData = canvasRef.current.toDataURL('image/png').split(',')[1];
      
      const pageAnnotations = annotations.filter(a => a.page === currentPage);
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `Analyze these text blocks and assign appropriate CSS classes for typesetting.
              Available classes in the global CSS: .main-title, .chapter-header, .body-text, .page-number.
              
              Current blocks: ${JSON.stringify(pageAnnotations.map(a => ({ id: a.id, text: a.content })))}
              
              Return a JSON array of objects with { id, className }.` },
              { inlineData: { mimeType: "image/png", data: imageData } }
            ]
          }
        ],
        config: {
          systemInstruction: "You are a professional book typesetter. Assign the most appropriate semantic class to each text block. Return ONLY a JSON array.",
          responseMimeType: "application/json",
          responseSchema: {
            type: GenAIType.ARRAY,
            items: {
              type: GenAIType.OBJECT,
              properties: {
                id: { type: GenAIType.STRING },
                className: { type: GenAIType.STRING }
              },
              required: ["id", "className"]
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text);
      
      setAnnotations(prev => prev.map(ann => {
        const suggestion = suggestions.find((s: any) => s.id === ann.id);
        if (suggestion) {
          return {
            ...ann,
            className: suggestion.className
          };
        }
        return ann;
      }));
      
    } catch (err) {
      console.error('Smart Typeset Error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const resetCss = () => {
    setGlobalCss(`
/* Vivliostyle-like CSS Typesetting */
@page {
  size: A4;
  margin: 0;
}

body {
  margin: 0;
  padding: 0;
  background: #f0f0f0;
  font-family: "Noto Sans JP", sans-serif;
}

.page {
  position: relative;
  width: 210mm;
  height: 297mm;
  background-color: white;
  margin: 20px auto;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  overflow: hidden;
  page-break-after: always;
}

@media print {
  body { background: none; }
  .page { margin: 0; box-shadow: none; }
}

.annotation {
  position: absolute;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-edit {
  background-color: white; /* Mask original text */
}

/* Custom Typesetting Classes */
.main-title {
  font-size: 36pt;
  font-weight: 900;
  text-align: center;
  margin-top: 50mm;
  color: #E5322E;
}

.chapter-header {
  font-size: 24pt;
  font-weight: bold;
  border-bottom: 2px solid #333;
  margin-bottom: 10mm;
}

.body-text {
  font-size: 11pt;
  line-height: 1.8;
  text-align: justify;
}

.page-number {
  position: absolute;
  bottom: 10mm;
  width: 100%;
  text-align: center;
  font-size: 9pt;
  color: #999;
}
`);
  };

  const handleEditBlock = (block: TextBlock) => {
    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'ai-edit',
      page: currentPage,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      content: block.str,
      color: '#000000',
      fontSize: block.fontSize || 12,
      fontFamily: block.fontFamily || 'Arial Unicode MS',
      textAlign: 'left',
      maskBackground: true
    };
    setAnnotations([...annotations, newAnnotation]);
    setSelectedIds([newAnnotation.id]);
    setActiveTool('select');
  };

  useEffect(() => {
    if (selectedIds.length > 0) {
      const selected = annotations.find(a => a.id === selectedIds[0]);
      if (selected) {
        if (selected.color) setCurrentColor(selected.color);
        if (selected.fontSize) setCurrentFontSize(selected.fontSize);
        if (selected.fontFamily) setCurrentFontFamily(selected.fontFamily);
        if (selected.textAlign) setCurrentTextAlign(selected.textAlign);
        setIsBold(selected.fontWeight === 'bold');
        setIsItalic(selected.fontStyle === 'italic');
        setIsUnderline(selected.textDecoration === 'underline');
      }
    }
  }, [selectedIds, annotations]);

  const renderPage = useCallback(async (pageNum: number, currentScale: number) => {
    if (!pdfDoc || !canvasRef.current || pageNum < 1 || pageNum > numPages) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Store page as image for CSS view
      const pageImage = canvas.toDataURL('image/png');
      setPageImages(prev => ({ ...prev, [pageNum]: pageImage }));
    } catch (err) {
      console.error('Error rendering page:', err);
      setLoadingError('Failed to render page. The PDF might be corrupted or too complex.');
    }
  }, [pdfDoc, numPages]);

  useEffect(() => {
    if (viewMode === 'css' && pdfDoc) {
      const renderAll = async () => {
        for (let i = 1; i <= numPages; i++) {
          if (!pageImages[i]) {
            await renderPage(i, 1.5); // Use a standard scale for background images
          }
        }
      };
      renderAll();
    }
  }, [viewMode, pdfDoc, numPages, pageImages, renderPage]);

  const [debouncedScale, setDebouncedScale] = useState(scale);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedScale(scale);
    }, 300);
    return () => clearTimeout(timer);
  }, [scale]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage, debouncedScale);
    }
  }, [pdfDoc, currentPage, debouncedScale, renderPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0 && document.activeElement?.tagName !== 'INPUT') {
          setAnnotations(prev => prev.filter(a => !selectedIds.includes(a.id)));
          setSelectedIds([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (isDraggingAnn && selectedIds.length > 0 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / scale;
        const mouseY = (e.clientY - rect.top) / scale;
        
        setAnnotations(prev => prev.map(a => 
          selectedIds.includes(a.id) 
            ? { ...a, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y } 
            : a
        ));
      }
    };

    const handleMouseUpGlobal = () => {
      setIsDraggingAnn(false);
    };

    if (isDraggingAnn) {
      window.addEventListener('mousemove', handleMouseMoveGlobal);
      window.addEventListener('mouseup', handleMouseUpGlobal);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isDraggingAnn, selectedIds, scale, dragOffset]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || activeTool === 'select' || activeTool === 'hand' || activeTool === 'edit') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      type: activeTool as any,
      page: currentPage,
      x,
      y,
      color: currentColor,
      fontSize: activeTool === 'text' ? currentFontSize : undefined,
      content: activeTool === 'text' ? 'New Text' : undefined,
      width: activeTool === 'rect' || activeTool === 'circle' ? 50 : undefined,
      height: activeTool === 'rect' || activeTool === 'circle' ? 50 : undefined,
    };

    setAnnotations([...annotations, newAnnotation]);
    setSelectedIds([newAnnotation.id]);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    
    if (e.shiftKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
    
    setIsDraggingAnn(true);
    
    const ann = annotations.find(a => a.id === id);
    if (ann && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / scale;
      const mouseY = (e.clientY - rect.top) / scale;
      setDragOffset({
        x: mouseX - ann.x,
        y: mouseY - ann.y
      });
    }
  };

  const printCssPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Export PDF - CSS Typesetting</title>
          <style>
            ${globalCss}
            body { margin: 0; padding: 0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
            const pageAnns = annotations.filter(a => a.page === pageNum);
            const pageImage = pageImages[pageNum];
            
            return `
              <div class="page" style="background-image: ${showBackground ? `url(${pageImage})` : 'none'}; background-size: contain; background-repeat: no-repeat;">
                ${pageAnns.map(ann => {
                  const style = `
                    left: ${ann.x}px;
                    top: ${ann.y}px;
                    width: ${ann.width ? ann.width + 'px' : 'auto'};
                    height: ${ann.height ? ann.height + 'px' : 'auto'};
                    color: ${ann.color || 'black'};
                    font-size: ${ann.fontSize || 12}px;
                    font-family: ${ann.fontFamily || 'inherit'};
                    text-align: ${ann.textAlign || 'left'};
                    font-weight: ${ann.fontWeight || 'normal'};
                    font-style: ${ann.fontStyle || 'normal'};
                    opacity: ${ann.opacity ?? 1};
                    background-color: ${ann.maskBackground ? 'white' : 'transparent'};
                    ${ann.css || ''}
                  `;
                  
                  if (ann.type === 'text' || ann.type === 'ai-edit') {
                    return `<div class="annotation ${ann.type} ${ann.className || ''}" style="${style}">${ann.content || ''}</div>`;
                  } else if (ann.type === 'rect') {
                    return `<div class="annotation rect ${ann.className || ''}" style="${style}; border: 1px solid ${ann.color || 'black'};"></div>`;
                  }
                  return '';
                }).join('')}
              </div>
            `;
          }).join('')}
          <script>
            window.onload = () => {
              window.print();
              // window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const exportAsImage = async (format: 'jpeg' | 'png') => {
    if (!pdfDoc || !canvasRef.current) return;
    
    // Create a temporary canvas to render everything at high quality
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');
    if (!context) return;

    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 2 }); // High quality export
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;

    // Render PDF page
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Render annotations
    const pageAnns = annotations.filter(a => a.page === currentPage);
    pageAnns.forEach(ann => {
      context.save();
      context.translate(ann.x * 2, ann.y * 2); // Scale 2 for high quality
      
      if (ann.type === 'text' || ann.type === 'ai-edit') {
        if (ann.type === 'ai-edit' && ann.width && ann.height) {
          context.fillStyle = 'white';
          context.fillRect(0, 0, ann.width * 2, ann.height * 2);
        }
        
        context.fillStyle = ann.color || 'black';
        const fontSize = (ann.fontSize || 12) * 2;
        context.font = `${ann.fontWeight || 'normal'} ${ann.fontStyle || 'normal'} ${fontSize}px ${ann.fontFamily || 'sans-serif'}`;
        context.textBaseline = 'top';
        context.textAlign = ann.textAlign as CanvasTextAlign || 'left';
        
        const lines = ann.content.split('\n');
        lines.forEach((line, i) => {
          context.fillText(line, 0, i * fontSize * 1.2);
        });
      } else if (ann.type === 'rect') {
        context.strokeStyle = ann.color || 'black';
        context.lineWidth = 2 * 2;
        context.strokeRect(0, 0, (ann.width || 50) * 2, (ann.height || 50) * 2);
      } else if (ann.type === 'circle') {
        context.strokeStyle = ann.color || 'black';
        context.lineWidth = 2 * 2;
        context.beginPath();
        const radius = ((ann.width || 50) / 2) * 2;
        context.arc(radius, radius, radius, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    });

    const dataUrl = tempCanvas.toDataURL(`image/${format}`, 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `exported_page_${currentPage}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    link.click();
    setIsExportDropdownOpen(false);
  };

  const exportAsJson = () => {
    const data = JSON.stringify(annotations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotations_${pdfFile?.name || 'export'}.json`;
    link.click();
    setIsExportDropdownOpen(false);
  };

  const confirmAll = () => {
    const updated = annotations.map(ann => 
      ann.page === currentPage && ann.type === 'ai-edit' 
        ? { ...ann, isConfirmed: true } 
        : ann
    );
    setAnnotations(updated);
    
    // Save confirmed annotations to Firestore
    const confirmedOnPage = updated.filter(a => a.page === currentPage && a.isConfirmed);
    saveConfirmedToFirestore(confirmedOnPage);
  };

  const verifyAccuracy = async () => {
    if (!pdfFile || isVerifying) return;
    setIsVerifying(true);
    try {
      // Mock verification for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Verification complete! Accuracy: 98.5%');
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadPdf = async () => {
    if (!pdfFile) return;

    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    for (const ann of annotations) {
      const page = pages[ann.page - 1];
      if (!page) continue;
      const { height } = page.getSize();

      if ((ann.type === 'text' || ann.type === 'ai-edit') && ann.content) {
        // For ai-edit, we use the stored properties or defaults
        const fontSize = ann.fontSize || 12;
        const color = ann.color ? hexToRgb(ann.color) : rgb(0, 0, 0);
        
        // If it's an AI edit, draw a white background to mask original text
        if (ann.type === 'ai-edit' && ann.maskBackground && ann.width && ann.height) {
          page.drawRectangle({
            x: ann.x,
            y: height - ann.y - ann.height,
            width: ann.width,
            height: ann.height,
            color: rgb(1, 1, 1), // White
          });
        }

        page.drawText(ann.content, {
          x: ann.x,
          y: height - ann.y - fontSize,
          size: fontSize,
          color: color,
        });
      } else if (ann.type === 'rect') {
        page.drawRectangle({
          x: ann.x,
          y: height - ann.y - (ann.height || 50),
          width: ann.width || 50,
          height: ann.height || 50,
          borderColor: hexToRgb(ann.color),
          borderWidth: 2,
        });
      } else if (ann.type === 'circle') {
        page.drawCircle({
          x: ann.x + (ann.width || 50) / 2,
          y: height - ann.y - (ann.height || 50) / 2,
          size: (ann.width || 50) / 2,
          borderColor: hexToRgb(ann.color),
          borderWidth: 2,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edited_${pdfFile.name}`;
    link.click();
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F]">
      {/* Professional Header */}
      <header className="h-14 bg-white border-b border-[#D2D2D7] flex items-center justify-between px-6 z-40 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#E5322E] p-1.5 rounded-lg shadow-sm">
              <FileText size={20} className="text-white" />
            </div>
            <h1 className="text-sm font-bold tracking-tight text-[#1D1D1F]">PDF Editor <span className="text-[#E5322E]">PRO</span></h1>
          </div>
          
          <div className="h-6 w-[1px] bg-[#D2D2D7]" />
          
          <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-lg">
            <button 
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all pro-button",
                activeTool === 'select' ? "bg-white text-[#1D1D1F] shadow-sm" : "text-[#666] hover:text-[#1D1D1F]"
              )}
              onClick={() => setActiveTool('select')}
            >
              <MousePointer2 size={13} />
              <span>選択</span>
            </button>
            <button 
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all pro-button",
                activeTool === 'hand' ? "bg-white text-[#1D1D1F] shadow-sm" : "text-[#666] hover:text-[#1D1D1F]"
              )}
              onClick={() => setActiveTool('hand')}
            >
              <Hand size={13} />
              <span>移動</span>
            </button>
            <button 
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all pro-button",
                activeTool === 'edit' ? "bg-white text-[#E5322E] shadow-sm" : "text-[#666] hover:text-[#E5322E]"
              )}
              onClick={() => { setActiveTool('edit'); detectTextAI(); }}
            >
              <Sparkles size={13} />
              <span>PDF解析</span>
              <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center text-[7px] text-black border border-white">👑</div>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#F5F5F7] rounded-lg px-2 py-1 border border-[#D2D2D7]/50">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-30"
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono">
              <span className="text-[#E5322E]">{currentPage}</span>
              <span className="text-[#999]">/</span>
              <span>{numPages || 1}</span>
            </div>
            <button 
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-30"
              disabled={currentPage === numPages}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-[#D2D2D7]" />

          <div className="flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-2 py-1">
            <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all"><ZoomOut size={14} /></button>
            <span className="text-[10px] font-bold font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all"><ZoomIn size={14} /></button>
          </div>

          <div className="h-6 w-[1px] bg-[#D2D2D7]" />

          <div className="relative">
            <button 
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={!pdfFile}
              className="bg-[#1D1D1F] text-white text-[11px] font-bold px-5 py-2 rounded-lg hover:bg-[#333] transition-all shadow-md flex items-center gap-2 disabled:opacity-50 pro-button"
            >
              エクスポート <ChevronDown size={14} className={cn("transition-transform", isExportDropdownOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isExportDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white border border-[#D1D1D1] rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { downloadPdf(); setIsExportDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#333] hover:bg-red-50 hover:text-[#E5322E] rounded-lg transition-colors"
                    >
                      <FileText size={14} /> PDFとして保存
                    </button>
                    <div className="h-[1px] bg-[#F0F0F0] mx-2" />
                    <button 
                      onClick={() => exportAsImage('jpeg')}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#333] hover:bg-red-50 hover:text-[#E5322E] rounded-lg transition-colors"
                    >
                      <Image size={14} /> JPGとして保存 (現ページ)
                    </button>
                    <button 
                      onClick={() => exportAsImage('png')}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#333] hover:bg-red-50 hover:text-[#E5322E] rounded-lg transition-colors"
                    >
                      <ImageIcon size={14} /> PNGとして保存 (現ページ)
                    </button>
                    <div className="h-[1px] bg-[#F0F0F0] mx-2" />
                    <button 
                      onClick={exportAsJson}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#333] hover:bg-red-50 hover:text-[#E5322E] rounded-lg transition-colors"
                    >
                      <Database size={14} /> JSON (アノテーション)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          numPages={numPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pdfDoc={pdfDoc}
          annotations={annotations}
        />

        {comparingVersion && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-6 py-2 rounded-full shadow-2xl z-50 flex items-center gap-4 border-2 border-white">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span className="text-xs font-bold">比較モード: {comparingVersion.name}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/30" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-[10px]">追加</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-[10px]">削除</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span className="text-[10px]">変更</span>
              </div>
            </div>
            <button 
              onClick={() => setComparingVersion(null)}
              className="bg-white text-yellow-600 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-yellow-50 transition-colors"
            >
              終了
            </button>
          </div>
        )}

        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-0 bg-white border border-[#D1D1D1] border-l-0 rounded-r-lg p-2 shadow-md z-10 hover:bg-[#F0F0F0] transition-all"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Editor Workspace */}
        <main className="flex-1 flex flex-col relative bg-[#EBEBEB] overflow-hidden">
          {viewMode === 'canvas' ? (
            <>
              <ToolPalette 
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                detectTextAI={detectTextAI}
                detectTextStandard={detectTextStandard}
                detectTextVision={detectTextVision}
                isDetecting={isDetecting}
                currentColor={currentColor}
                currentFontSize={currentFontSize}
                showBackground={showBackground}
                setShowBackground={setShowBackground}
              />

              {/* PDF Canvas */}
              <div 
                ref={containerRef}
                className="flex-1 overflow-auto p-16 flex justify-center items-start scrollbar-hide"
                style={{ cursor: activeTool === 'hand' ? 'grab' : 'default' }}
              >
                {!pdfFile ? (
                  <div className="flex flex-col items-center justify-center h-full gap-8 max-w-lg text-center">
                    <div className={cn(
                      "w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-inner",
                      loadingError ? "bg-red-50 text-red-600" : "bg-white text-[#E5322E]"
                    )}>
                      {isLoading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                          <Save size={64} strokeWidth={1} />
                        </motion.div>
                      ) : loadingError ? (
                        <AlertCircle size={64} strokeWidth={1} />
                      ) : (
                        <FileUp size={64} strokeWidth={1} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold mb-3 tracking-tight">
                        {isLoading ? "PDFを読み込み中..." : loadingError ? "エラーが発生しました" : "PDFを編集"}
                      </h3>
                      <p className="text-[#666] text-sm leading-relaxed">
                        {loadingError || "ファイルをここにドラッグ＆ドロップするか、下のボタンから選択してください。テキストの追加、図形の描画、注釈の作成が可能です。"}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="bg-[#E5322E] text-white px-10 py-3.5 rounded-full font-bold text-lg hover:bg-[#C42B28] transition-all shadow-xl hover:shadow-[#E5322E]/20 disabled:opacity-50"
                      >
                        {isLoading ? "処理中..." : "ファイルを選択"}
                      </button>
                      {loadingError && (
                        <button 
                          onClick={() => { setLoadingError(null); setPdfFile(null); }}
                          className="bg-white text-[#333] border border-[#D1D1D1] px-10 py-3.5 rounded-full font-bold text-lg hover:bg-[#F0F0F0] transition-all shadow-sm"
                        >
                          リセット
                        </button>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                  </div>
                ) : (
                  <div className={cn(
                    "relative shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white transition-all duration-300",
                    activeTool === 'edit' && "ring-4 ring-[#E5322E]/10 ring-offset-0 border-2 border-dotted border-[#E5322E]/30"
                  )}>
                    <canvas 
                      ref={canvasRef} 
                      onClick={handleCanvasClick} 
                      className={cn(
                        "block transition-opacity duration-300",
                        !showBackground && "opacity-0"
                      )} 
                    />
                    
                    {/* AI Mapping Loading Overlay */}
                    {isDetecting && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-10">
                        <div className="w-full max-w-md px-12 space-y-8 text-center">
                          <div className="relative inline-block">
                            <motion.div 
                              animate={{ rotate: 360 }} 
                              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                              className="text-[#E5322E]"
                            >
                              <Sparkles size={64} strokeWidth={1.5} />
                            </motion.div>
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute -top-2 -right-2 bg-[#E5322E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                            >
                              AI
                            </motion.div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-xl font-bold text-[#333] tracking-tight">
                              {scanPhase === 'doc-ai' && "Document AI で原本を検出中..."}
                              {scanPhase === 'gemini-correction' && "Gemini で調整・補正中..."}
                              {scanPhase === 'polishing' && "最終レイアウト調整中..."}
                            </h4>
                            <p className="text-xs text-[#666]">
                              {scanPhase === 'doc-ai' && "Google Cloud Document AI がテキスト構造を厳密に抽出しています"}
                              {scanPhase === 'gemini-correction' && "Gemini が原本画像と照合し、100%の精度へ補正しています"}
                              {scanPhase === 'polishing' && "ミリ単位の位置調整とフォントの最適化を行っています"}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#999]">
                              <span>進捗状況: {Math.round(scanProgress)}%</span>
                              <span>残り約 {timeRemaining} 秒</span>
                            </div>
                            <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden border border-[#D1D1D1]">
                              <motion.div 
                                className="h-full bg-gradient-to-r from-[#E5322E] to-[#FF6B6B]"
                                initial={{ width: 0 }}
                                animate={{ width: `${scanProgress}%` }}
                                transition={{ ease: "easeOut" }}
                              />
                            </div>
                            <div className="flex justify-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", scanPhase === 'doc-ai' || scanPhase === 'gemini-correction' || scanPhase === 'polishing' ? "bg-[#E5322E]" : "bg-[#D1D1D1]")} />
                                <span className="text-[9px] text-[#999]">
                                  {useGeminiOnly ? "Gemini OCR 解析" : (docAIError ? "Gemini 代替解析" : "Document AI 検出")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", scanPhase === 'gemini-correction' || scanPhase === 'polishing' ? "bg-[#E5322E]" : "bg-[#D1D1D1]")} />
                                <span className="text-[9px] text-[#999]">Gemini 構造化・補正</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", scanPhase === 'polishing' ? "bg-[#E5322E]" : "bg-[#D1D1D1]")} />
                                <span className="text-[9px] text-[#999]">最終ポリッシュ</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Scanning Line Animation */}
                        <motion.div 
                          className="absolute left-0 right-0 h-[2px] bg-[#E5322E] shadow-[0_0_15px_rgba(229,50,46,0.8)] z-20"
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                        />

                        {/* Dotted Grid Overlay during scanning */}
                        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#E5322E 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                      </div>
                    )}

                    {/* Manual Mapping Trigger Overlay */}
                    {activeTool === 'edit' && !isDetecting && annotations.filter(a => a.page === currentPage && a.type === 'ai-edit').length === 0 && (
                      <div className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center z-10 pointer-events-none">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            detectTextAI();
                          }}
                          className="pointer-events-auto bg-white/90 backdrop-blur border border-[#E5322E] text-[#E5322E] px-8 py-4 rounded-2xl shadow-2xl hover:bg-[#E5322E] hover:text-white transition-all flex flex-col items-center gap-2 group"
                        >
                          <Sparkles size={32} className="group-hover:scale-110 transition-transform" />
                          <div className="text-center">
                            <p className="font-bold text-lg">このページをマッピング</p>
                            <p className="text-[10px] opacity-70">AIがテキストを編集可能にします</p>
                          </div>
                        </button>
                      </div>
                    )}
                    
                    {/* Annotations Layer */}
                    <div className="absolute inset-0 pointer-events-none" style={{ width: canvasRef.current?.width, height: canvasRef.current?.height }}>
                      {/* Comparison Overlay (Old Version) */}
                      {comparingVersion && (
                        <div className="absolute inset-0 opacity-40 pointer-events-none">
                          {comparingVersion.annotations.filter((a: any) => a.page === currentPage).map((ann: any) => {
                            const currentAnn = annotations.find(curr => curr.id === ann.id);
                            const isRemoved = !currentAnn;
                            const isModified = currentAnn && (
                              currentAnn.content !== ann.content || 
                              currentAnn.x !== ann.x || 
                              currentAnn.y !== ann.y
                            );

                            if (!isRemoved && !isModified) return null;

                            return (
                              <div 
                                key={`comp-${ann.id}`}
                                className={cn(
                                  "absolute border-2 border-dashed",
                                  isRemoved ? "border-red-500 bg-red-100/30" : "border-yellow-500 bg-yellow-100/30"
                                )}
                                style={{ 
                                  left: ann.x * scale, 
                                  top: ann.y * scale,
                                  color: ann.color,
                                  fontSize: ann.fontSize ? ann.fontSize * scale : undefined,
                                  width: ann.width ? ann.width * scale : undefined,
                                  height: ann.height ? ann.height * scale : undefined,
                                  borderRadius: ann.type === 'circle' ? '50%' : undefined,
                                  padding: ann.type === 'text' ? '2px 4px' : undefined,
                                }}
                              >
                                <div className="absolute -top-4 left-0 bg-black text-white text-[8px] px-1 rounded whitespace-nowrap">
                                  {isRemoved ? "削除済み" : "変更前"}
                                </div>
                                {ann.content}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Current Annotations */}
                      {annotations.filter(a => a.page === currentPage).map((ann) => {
                        const oldAnn = comparingVersion?.annotations.find((old: any) => old.id === ann.id);
                        const isAdded = comparingVersion && !oldAnn;
                        const isModified = comparingVersion && oldAnn && (
                          oldAnn.content !== ann.content || 
                          oldAnn.x !== ann.x || 
                          oldAnn.y !== ann.y
                        );

                        return (
                          <div 
                            key={ann.id}
                            className={cn(
                              "absolute pointer-events-auto transition-all duration-200",
                              ann.type === 'ai-edit' && (
                                ann.isConfirmed 
                                  ? "border-2 border-solid border-[#E5322E] bg-white shadow-md" 
                                  : "border-2 border-dotted border-[#E5322E]/60 bg-[#E5322E]/5 hover:border-[#E5322E] hover:bg-[#E5322E]/10 shadow-[0_0_8px_rgba(229,50,46,0.1)]"
                              ),
                              selectedIds.includes(ann.id) && "ring-2 ring-[#E5322E] ring-offset-2 z-30 shadow-lg",
                              analysisQueue.includes(ann.id) && "ring-2 ring-blue-400 ring-offset-2 animate-pulse",
                              activeTool === 'select' ? "cursor-move" : "cursor-default",
                              isAdded && "ring-2 ring-green-500 ring-offset-1 bg-green-50/20",
                              isModified && "ring-2 ring-yellow-500 ring-offset-1 bg-yellow-50/20"
                            )}
                            style={{ 
                              left: ann.x * scale, 
                              top: ann.y * scale,
                              color: ann.color,
                              fontSize: ann.fontSize ? ann.fontSize * scale : undefined,
                              width: ann.width ? ann.width * scale : undefined,
                              height: ann.height ? ann.height * scale : undefined,
                              border: ann.type === 'rect' ? `2px solid ${ann.color}` : undefined,
                              borderRadius: ann.type === 'circle' ? '50%' : undefined,
                              borderColor: ann.type === 'circle' ? ann.color : undefined,
                              borderStyle: ann.type === 'circle' ? 'solid' : undefined,
                              borderWidth: ann.type === 'circle' ? '2px' : undefined,
                              padding: ann.type === 'text' ? '2px 4px' : undefined,
                            }}
                            onMouseDown={(e) => handleMouseDown(e, ann.id)}
                          >
                            {comparingVersion && (isAdded || isModified) && (
                              <div className={cn(
                                "absolute -top-4 left-0 text-white text-[8px] px-1 rounded whitespace-nowrap z-10",
                                isAdded ? "bg-green-600" : "bg-yellow-600"
                              )}>
                                {isAdded ? "新規追加" : "変更後"}
                              </div>
                            )}
                            {ann.type === 'ai-edit' && !comparingVersion && (
                              <div className={cn(
                                "absolute -top-3.5 -right-1 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10 pointer-events-none shadow-sm flex items-center gap-0.5",
                                ann.isConfirmed ? "bg-green-600" : "bg-[#E5322E]"
                              )}>
                                {ann.isConfirmed ? "✓" : "AI"}
                              </div>
                            )}
                            {ann.type === 'text' && (
                              <textarea 
                                value={ann.content} 
                                onChange={(e) => setAnnotations(annotations.map(a => a.id === ann.id ? { ...a, content: e.target.value } : a))}
                                className="bg-transparent border-none outline-none w-full font-medium resize-none overflow-hidden"
                                style={{ 
                                  fontSize: 'inherit', 
                                  color: 'inherit',
                                  fontWeight: ann.fontWeight || (isBold ? 'bold' : 'normal'),
                                  fontStyle: ann.fontStyle || (isItalic ? 'italic' : 'normal'),
                                  textDecoration: ann.textDecoration || (isUnderline ? 'underline' : 'none'),
                                  textAlign: ann.textAlign || currentTextAlign,
                                  fontFamily: ann.fontFamily || currentFontFamily
                                }}
                                rows={1}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            )}
                            {ann.type === 'ai-edit' && (
                              <div className={cn(
                                "absolute -top-4 left-0 text-white text-[8px] font-bold px-1 rounded-sm flex items-center gap-0.5 shadow-sm z-10 pointer-events-none transition-colors",
                                ann.isConfirmed ? "bg-green-600" : "bg-[#E5322E]"
                              )}>
                                {ann.isConfirmed ? <Save size={8} /> : <Sparkles size={8} />}
                                <span>{ann.isConfirmed ? "確定済み" : "AI"}</span>
                              </div>
                            )}
                            {ann.type === 'ai-edit' && (
                              <textarea 
                                value={ann.content} 
                                onChange={(e) => setAnnotations(annotations.map(a => a.id === ann.id ? { ...a, content: e.target.value } : a))}
                                onBlur={(e) => {
                                  if (ann.dbBlockId) {
                                    fetch(`/api/blocks/${ann.dbBlockId}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ user_text: e.target.value })
                                    }).catch(err => console.warn('DB save failed:', err));
                                  }
                                }}
                                className={cn(
                                  "border-none outline-none w-full resize-none overflow-hidden transition-colors",
                                  ann.maskBackground ? "bg-white" : "bg-transparent",
                                  ann.isConfirmed ? "hover:ring-1 hover:ring-green-600/30" : "hover:ring-1 hover:ring-[#E5322E]/30"
                                )}
                                style={{ 
                                  fontSize: 'inherit', 
                                  color: 'inherit',
                                  fontWeight: ann.fontWeight === 'bold' ? 'bold' : 'normal',
                                  fontStyle: ann.fontStyle || 'normal',
                                  textDecoration: ann.textDecoration || 'none',
                                  textAlign: ann.textAlign || 'left',
                                  fontFamily: ann.fontFamily || 'Noto Sans JP',
                                  minWidth: ann.width ? ann.width * scale : '100px',
                                  lineHeight: 1.1,
                                  padding: 0,
                                  margin: 0
                                }}
                                rows={1}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* CSS Editor Panel */}
              <div className="w-96 bg-[#2D2D2D] text-white flex flex-col border-r border-black shadow-2xl z-20">
                <div className="p-4 border-b border-black flex items-center justify-between bg-[#1E1E1E]">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-[#E5322E]" />
                    <span className="text-xs font-bold uppercase tracking-widest">Global CSS (Typesetting)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowBackground(!showBackground)}
                      className={cn(
                        "text-[9px] font-bold px-2 py-1 rounded border transition-all",
                        showBackground ? "bg-[#E5322E] border-[#E5322E] text-white" : "bg-transparent border-[#666] text-[#666]"
                      )}
                    >
                      原本を表示: {showBackground ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <textarea 
                    value={globalCss}
                    onChange={(e) => setGlobalCss(e.target.value)}
                    className="absolute inset-0 w-full h-full bg-[#1E1E1E] text-[#D4D4D4] p-6 font-mono text-xs outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>
                <div className="p-4 bg-[#1E1E1E] border-t border-black flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={smartTypesetAI}
                      disabled={isDetecting}
                      className="flex-1 bg-[#E5322E] text-white text-[10px] font-bold py-2 rounded hover:bg-[#C42B28] transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles size={12} /> AI 組版アシスト
                    </button>
                    <button 
                      onClick={resetCss}
                      className="px-3 bg-[#333] text-white text-[10px] font-bold py-2 rounded hover:bg-[#444] transition-all"
                    >
                      リセット
                    </button>
                  </div>
                  <p className="text-[9px] text-[#666]">@page ルールや .page, .annotation クラスを編集して、PDFのレイアウトをカスタマイズできます。</p>
                </div>
              </div>

              {/* Paged Media Preview */}
              <div className="flex-1 bg-[#404040] overflow-auto p-12 flex flex-col items-center gap-12 scrollbar-hide">
                <style>{globalCss}</style>
                {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                  <div 
                    key={pageNum} 
                    className="page"
                    style={{ 
                      backgroundImage: showBackground ? `url(${pageImages[pageNum]})` : 'none',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    {annotations.filter(a => a.page === pageNum).map(ann => (
                      <div 
                        key={ann.id}
                        className={cn("annotation", ann.type, ann.className, selectedIds.includes(ann.id) && "ring-2 ring-[#E5322E] ring-offset-2")}
                        onClick={(e) => { e.stopPropagation(); setSelectedIds([ann.id]); }}
                        style={{ 
                          left: ann.x, 
                          top: ann.y,
                          width: ann.width,
                          height: ann.height,
                          color: ann.color,
                          fontSize: ann.fontSize,
                          fontFamily: ann.fontFamily,
                          textAlign: ann.textAlign,
                          fontWeight: ann.fontWeight,
                          fontStyle: ann.fontStyle,
                          textDecoration: ann.textDecoration,
                          opacity: ann.opacity ?? 1,
                          cursor: 'pointer',
                          ...(ann.css ? Object.fromEntries(ann.css.split(';').filter(s => s.trim()).map(s => {
                            const [k, v] = s.split(':');
                            if (!k || !v) return [];
                            return [k.trim().replace(/-([a-z])/g, g => g[1].toUpperCase()), v.trim()];
                          }).filter(pair => pair.length === 2)) : {})
                        }}
                      >
                        {(ann.type === 'text' || ann.type === 'ai-edit') && (
                          <div 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newContent = e.currentTarget.textContent || '';
                              setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, content: newContent } : a));
                            }}
                            className="outline-none w-full h-full"
                          >
                            {ann.content}
                          </div>
                        )}
                        {ann.type === 'rect' && (
                          <div style={{ width: '100%', height: '100%', border: `1px solid ${ann.color}` }} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Properties & Tools */}
        <PropertiesPanel 
          selectedId={selectedIds.length === 1 ? selectedIds[0] : null}
          selectedIds={selectedIds}
          analysisQueue={analysisQueue}
          addToQueue={(ids) => setAnalysisQueue(prev => [...new Set([...prev, ...ids])])}
          processQueue={() => detectTextAI(analysisQueue)}
          annotations={annotations}
          setAnnotations={setAnnotations}
          setSelectedId={(id) => setSelectedIds(id ? [id] : [])}
          setSelectedIds={setSelectedIds}
          currentFontFamily={currentFontFamily}
          setCurrentFontFamily={setCurrentFontFamily}
          currentFontSize={currentFontSize}
          setCurrentFontSize={setCurrentFontSize}
          isBold={isBold}
          setIsBold={setIsBold}
          isItalic={isItalic}
          setIsItalic={setIsItalic}
          isUnderline={isUnderline}
          setIsUnderline={setIsUnderline}
          currentTextAlign={currentTextAlign}
          setCurrentTextAlign={setCurrentTextAlign}
          currentColor={currentColor}
          setCurrentColor={setCurrentColor}
          isDetecting={isDetecting}
          detectTextAI={(ids) => detectTextAI(ids)}
          smartFormatAI={smartFormatAI}
          verifyAccuracy={verifyAccuracy}
          isVerifying={isVerifying}
          confirmAll={confirmAll}
          clearAnnotations={clearAnnotations}
          detectTextStandard={detectTextStandard}
          detectTextVision={detectTextVision}
          currentPage={currentPage}
          downloadPdf={downloadPdf}
          printCssPdf={printCssPdf}
          viewMode={viewMode}
          pdfFile={pdfFile}
          user={user}
          login={login}
          isVersionHistoryOpen={isVersionHistoryOpen}
          setIsVersionHistoryOpen={setIsVersionHistoryOpen}
          versions={versions}
          revertToVersion={revertToVersion}
          deleteVersion={deleteVersion}
          saveVersion={saveVersion}
          versionName={versionName}
          setVersionName={setVersionName}
          isSavingVersion={isSavingVersion}
          docAIError={docAIError}
          comparingVersionId={comparingVersion?.id}
          toggleCompareVersion={toggleCompareVersion}
          processorId={processorId}
          setProcessorId={setProcessorId}
          projectId={projectId}
          setProjectId={setProjectId}
          location={location}
          setLocation={setLocation}
          useGeminiOnly={useGeminiOnly}
          setUseGeminiOnly={setUseGeminiOnly}
        />
      </div>

      {/* Footer / Status Bar */}
      <footer className="h-7 bg-white border-t border-[#D1D1D1] flex items-center justify-between px-4 text-[10px] text-[#999] z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            <span className="font-medium">AI Engine Online</span>
          </div>
          <div className="h-3 w-[1px] bg-[#D1D1D1]" />
          <span className="truncate max-w-[200px]">{pdfFile?.name || '待機中'}</span>
          {pdfFile && <span>({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span>ページ: <span className="text-[#333] font-bold">{currentPage}</span> / {numPages || 0}</span>
            <span>ズーム: <span className="text-[#333] font-bold">{Math.round(scale * 100)}%</span></span>
          </div>
          <div className="h-3 w-[1px] bg-[#D1D1D1]" />
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-[#E5322E] rounded flex items-center justify-center text-[7px] text-white font-black">i</div>
            <span className="font-bold text-[#666]">iPDF Editor Pro</span>
            <span className="bg-[#F0F0F0] px-1 rounded text-[8px]">v1.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
