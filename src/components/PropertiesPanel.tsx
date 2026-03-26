import React from 'react';
import { Settings, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, ChevronRight, Sparkles, Save, Type, Search, Eye, EyeOff, Database, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Annotation } from '../types';
import { FONTS, COLORS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

interface PropertiesPanelProps {
  selectedId: string | null;
  selectedIds: string[];
  analysisQueue: string[];
  addToQueue: (ids: string[]) => void;
  processQueue: () => void;
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  currentFontFamily: string;
  setCurrentFontFamily: (font: string) => void;
  currentFontSize: number;
  setCurrentFontSize: (size: number) => void;
  isBold: boolean;
  setIsBold: (bold: boolean) => void;
  isItalic: boolean;
  setIsItalic: (italic: boolean) => void;
  isUnderline: boolean;
  setIsUnderline: (underline: boolean) => void;
  currentTextAlign: 'left' | 'center' | 'right';
  setCurrentTextAlign: (align: 'left' | 'center' | 'right') => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  isDetecting: boolean;
  detectTextAI: (targetIds?: string[]) => void;
  smartFormatAI: () => void;
  verifyAccuracy: () => void;
  isVerifying: boolean;
  confirmAll: () => void;
  clearAnnotations: () => void;
  detectTextStandard: () => void;
  detectTextVision: () => void;
  currentPage: number;
  downloadPdf: () => void;
  printCssPdf: () => void;
  viewMode: 'canvas' | 'css';
  pdfFile: File | null;
  user: User | null;
  login: () => void;
  isVersionHistoryOpen: boolean;
  setIsVersionHistoryOpen: (open: boolean) => void;
  versions: any[];
  revertToVersion: (version: any) => void;
  deleteVersion: (id: string) => void;
  saveVersion: () => void;
  versionName: string;
  setVersionName: (name: string) => void;
  isSavingVersion: boolean;
  docAIError: string | null;
  comparingVersionId?: string;
  toggleCompareVersion: (version: any) => void;
  processorId: string;
  setProcessorId: (id: string) => void;
  projectId: string;
  setProjectId: (id: string) => void;
  location: string;
  setLocation: (loc: string) => void;
  useGeminiOnly: boolean;
  setUseGeminiOnly: (val: boolean) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedId,
  selectedIds,
  analysisQueue,
  addToQueue,
  processQueue,
  annotations,
  setAnnotations,
  setSelectedId,
  setSelectedIds,
  currentFontFamily,
  setCurrentFontFamily,
  currentFontSize,
  setCurrentFontSize,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  isUnderline,
  setIsUnderline,
  currentTextAlign,
  setCurrentTextAlign,
  currentColor,
  setCurrentColor,
  isDetecting,
  detectTextAI,
  smartFormatAI,
  verifyAccuracy,
  isVerifying,
  confirmAll,
  clearAnnotations,
  detectTextStandard,
  detectTextVision,
  currentPage,
  downloadPdf,
  printCssPdf,
  viewMode,
  pdfFile,
  user,
  login,
  isVersionHistoryOpen,
  setIsVersionHistoryOpen,
  versions,
  revertToVersion,
  deleteVersion,
  saveVersion,
  versionName,
  setVersionName,
  isSavingVersion,
  docAIError,
  comparingVersionId,
  toggleCompareVersion,
  processorId,
  setProcessorId,
  projectId,
  setProjectId,
  location,
  setLocation,
  useGeminiOnly,
  setUseGeminiOnly,
}) => {
  const [showProjectId, setShowProjectId] = React.useState(false);
  const [showProcessorId, setShowProcessorId] = React.useState(false);
  const selected = annotations.find(a => a.id === selectedId);

  return (
    <aside className="w-80 bg-[#F8F9FA] border-l border-[#D1D1D1] flex flex-col z-10 hidden xl:flex shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
      <div className="p-4 border-b border-[#D1D1D1] flex items-center justify-between bg-white">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1A1A1A]">プロパティ</span>
          {user && <span className="text-[9px] font-mono text-[#999] truncate max-w-[120px] mt-0.5 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{user.email}</span>}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <span className="text-[9px] font-mono font-bold text-[#E5322E] bg-red-50 px-2 py-0.5 rounded border border-red-100 shadow-sm">
              SELECTED: {selectedIds.length.toString().padStart(2, '0')}
            </span>
          )}
          <div className="flex gap-1">
            {!user ? (
              <button 
                onClick={login}
                className="text-[10px] font-bold text-[#E5322E] hover:bg-red-50 px-2 py-1 rounded transition-colors border border-[#E5322E]"
              >
                ログイン
              </button>
            ) : (
              <button className="p-1.5 hover:bg-[#F0F0F0] rounded transition-colors text-[#666]"><Settings size={14} /></button>
            )}
            {selectedId && (
              <button 
                onClick={() => { 
                  if (selectedIds.length > 0) {
                    setAnnotations(annotations.filter(a => !selectedIds.includes(a.id))); 
                    setSelectedId(null); 
                  }
                }} 
                className="text-[#E5322E] hover:bg-red-50 p-1.5 rounded transition-colors"
                title="削除"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        {/* Version History Section */}
        {user && pdfFile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1 h-1 bg-[#E5322E] rounded-full" />
                バージョン履歴
              </h3>
              <button 
                onClick={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
                className="text-[9px] font-bold text-[#E5322E] hover:bg-red-50 px-2 py-0.5 rounded border border-transparent hover:border-red-100 transition-all"
              >
                {isVersionHistoryOpen ? 'CLOSE' : 'VIEW ALL'}
              </button>
            </div>

            <AnimatePresence>
              {isVersionHistoryOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  {/* Save Version Form */}
                  <div className="p-3 bg-white rounded-lg border border-[#D1D1D1] space-y-2 shadow-sm">
                    <input 
                      type="text" 
                      placeholder="バージョン名を入力..."
                      className="w-full text-[10px] border border-[#D1D1D1] rounded px-2 py-2 outline-none focus:border-[#E5322E] focus:ring-1 focus:ring-red-100 transition-all"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                    />
                    <button 
                      onClick={saveVersion}
                      disabled={isSavingVersion || !versionName.trim()}
                      className="w-full bg-[#E5322E] text-white text-[10px] font-bold py-2 rounded-md disabled:opacity-50 hover:bg-[#C42B28] transition-colors shadow-sm"
                    >
                      {isSavingVersion ? '保存中...' : '現在の状態を保存'}
                    </button>
                  </div>

                  {/* Versions List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {versions.length === 0 ? (
                      <p className="text-[10px] text-[#999] text-center py-4 italic bg-white rounded border border-dashed border-[#D1D1D1]">保存されたバージョンはありません</p>
                    ) : (
                      versions.map((v) => (
                        <div key={v.id} className="group p-2.5 bg-white border border-[#D1D1D1] rounded-md hover:border-[#E5322E] transition-all shadow-sm">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-[10px] font-bold text-[#1A1A1A] truncate pr-2">{v.name}</span>
                            <button 
                              onClick={() => deleteVersion(v.id)}
                              className="text-[#999] hover:text-[#E5322E] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-mono text-[#999]">
                              {v.createdAt?.toDate().toLocaleString('ja-JP', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleCompareVersion(v)}
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                                  comparingVersionId === v.id 
                                    ? "bg-yellow-500 text-white" 
                                    : "text-[#666] hover:bg-[#F0F0F0]"
                                )}
                              >
                                {comparingVersionId === v.id ? "比較中" : "比較"}
                              </button>
                              <button 
                                onClick={() => revertToVersion(v)}
                                className="text-[9px] font-bold text-[#E5322E] hover:underline"
                              >
                                復元
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Text Style Section */}
        <div className="space-y-5">
          <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em]">テキストスタイル</h3>
          
          <div className="space-y-4">
            {selectedId && (selected?.type === 'text' || selected?.type === 'ai-edit') && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#666] font-bold uppercase tracking-wider">テキスト内容</label>
                <textarea 
                  className="w-full text-xs border border-[#D1D1D1] rounded-md px-3 py-2 outline-none bg-white focus:border-[#E5322E] focus:ring-1 focus:ring-red-100 transition-all shadow-sm min-h-[60px] resize-y"
                  value={selected?.content || ''}
                  onChange={(e) => {
                    const content = e.target.value;
                    setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, content } : a));
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-[#666] font-bold uppercase tracking-wider">フォント</label>
              <select 
                className="w-full text-xs border border-[#D1D1D1] rounded-md px-3 py-2.5 outline-none bg-white focus:border-[#E5322E] focus:ring-1 focus:ring-red-100 transition-all shadow-sm"
                value={selectedId ? (selected?.fontFamily || currentFontFamily) : currentFontFamily}
                onChange={(e) => {
                  const font = e.target.value;
                  setCurrentFontFamily(font);
                  if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontFamily: font } : a));
                }}
              >
                {FONTS.map(font => <option key={font}>{font}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-[#666] font-bold uppercase tracking-wider">サイズ</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="8" 
                  max="72" 
                  value={selectedId ? (selected?.fontSize || currentFontSize) : currentFontSize}
                  onChange={(e) => {
                    const size = parseInt(e.target.value);
                    setCurrentFontSize(size);
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontSize: size } : a));
                  }}
                  className="flex-1 h-1 bg-[#E0E0E0] rounded-lg appearance-none cursor-pointer accent-[#E5322E]"
                />
                <input 
                  type="number" 
                  className="w-14 text-xs font-mono border border-[#D1D1D1] rounded-md px-2 py-1.5 outline-none text-center bg-white focus:border-[#E5322E] transition-all"
                  value={selectedId ? (selected?.fontSize || currentFontSize) : currentFontSize}
                  onChange={(e) => {
                    const size = parseInt(e.target.value);
                    setCurrentFontSize(size);
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontSize: size } : a));
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Text Formatting */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#666] font-bold uppercase tracking-wider">書式</label>
            <div className="flex items-center gap-1.5">
              <div className="flex bg-white border border-[#D1D1D1] rounded-md p-1 shadow-sm">
                <FormatButton 
                  icon={<Bold size={14} />} 
                  active={isBold} 
                  onClick={() => {
                    const newVal = !isBold;
                    setIsBold(newVal);
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontWeight: newVal ? 'bold' : 'normal' } : a));
                  }} 
                />
                <FormatButton 
                  icon={<Italic size={14} />} 
                  active={isItalic} 
                  onClick={() => {
                    const newVal = !isItalic;
                    setIsItalic(newVal);
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontStyle: newVal ? 'italic' : 'normal' } : a));
                  }} 
                />
                <FormatButton 
                  icon={<Underline size={14} />} 
                  active={isUnderline} 
                  onClick={() => {
                    const newVal = !isUnderline;
                    setIsUnderline(newVal);
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textDecoration: newVal ? 'underline' : 'none' } : a));
                  }} 
                />
              </div>
              <div className="flex bg-white border border-[#D1D1D1] rounded-md p-1 shadow-sm">
                <FormatButton 
                  icon={<AlignLeft size={14} />} 
                  active={currentTextAlign === 'left'} 
                  onClick={() => {
                    setCurrentTextAlign('left');
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textAlign: 'left' } : a));
                  }} 
                />
                <FormatButton 
                  icon={<AlignCenter size={14} />} 
                  active={currentTextAlign === 'center'} 
                  onClick={() => {
                    setCurrentTextAlign('center');
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textAlign: 'center' } : a));
                  }} 
                />
                <FormatButton 
                  icon={<AlignRight size={14} />} 
                  active={currentTextAlign === 'right'} 
                  onClick={() => {
                    setCurrentTextAlign('right');
                    if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textAlign: 'right' } : a));
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em]">カラー</h3>
            {selectedId && selected?.type === 'ai-edit' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    id="mask-bg"
                    checked={selected?.maskBackground ?? false}
                    onChange={(e) => {
                      const maskBackground = e.target.checked;
                      setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, maskBackground } : a));
                    }}
                    className="w-3 h-3 accent-[#E5322E] cursor-pointer"
                  />
                  <label htmlFor="mask-bg" className="text-[9px] text-[#666] font-bold cursor-pointer">背景を隠す</label>
                </div>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    id="is-confirmed"
                    checked={selected?.isConfirmed ?? false}
                    onChange={(e) => {
                      const isConfirmed = e.target.checked;
                      setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, isConfirmed } : a));
                    }}
                    className="w-3 h-3 accent-[#E5322E] cursor-pointer"
                  />
                  <label htmlFor="is-confirmed" className="text-[9px] text-[#666] font-bold cursor-pointer">確定済み</label>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-6 gap-2.5 p-3 bg-white border border-[#D1D1D1] rounded-lg shadow-sm">
            {COLORS.map((color, i) => (
              <button 
                key={i}
                onClick={() => { setCurrentColor(color); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, color } : a)); }}
                className={cn(
                  "w-6 h-6 rounded-full border border-[#D1D1D1] transition-all hover:scale-110 shadow-sm",
                  (selectedId ? selected?.color === color : currentColor === color) && "ring-2 ring-[#E5322E] ring-offset-2"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* CSS Typesetting Section (Individual) */}
        {selectedId && (
          <div className="space-y-5 pt-6 border-t border-[#D1D1D1]">
            <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em]">CSS 組版 (個別設定)</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#666] font-bold uppercase tracking-wider">クラス名</label>
                <input 
                  type="text" 
                  placeholder="例: main-title, chapter-header"
                  className="w-full text-xs font-mono border border-[#D1D1D1] rounded-md px-3 py-2.5 outline-none bg-white focus:border-[#E5322E] transition-all shadow-sm"
                  value={selected?.className || ''}
                  onChange={(e) => {
                    const className = e.target.value;
                    setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, className } : a));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#666] font-bold uppercase tracking-wider">カスタム CSS</label>
                <textarea 
                  placeholder="例: font-variant: small-caps; letter-spacing: 2px;"
                  className="w-full text-xs border border-[#D1D1D1] rounded-md px-3 py-2.5 outline-none bg-white focus:border-[#E5322E] transition-all h-28 font-mono resize-none shadow-sm"
                  value={selected?.css || ''}
                  onChange={(e) => {
                    const css = e.target.value;
                    setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, css } : a));
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* AI Mapping Status */}
        <div className="pt-8 border-t border-[#D1D1D1] space-y-6">
          <div className="bg-white p-4 rounded-xl border border-[#D1D1D1] space-y-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E5322E]" />
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Database size={48} className="text-[#E5322E]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1A1A1A]">
                <Sparkles size={16} className="text-[#E5322E]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                  {useGeminiOnly ? "Gemini AI Mapping" : "Document AI Mapping"}
                </span>
              </div>
              <div className={cn(
                "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border",
                isDetecting ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" : 
                (docAIError ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-600 border-green-200")
              )}>
                {isDetecting ? "BUSY" : (docAIError ? "FALLBACK" : "READY")}
              </div>
            </div>
            <p className="text-[10px] text-[#666] leading-relaxed relative z-10">
              {useGeminiOnly 
                ? "Gemini 3.1 Pro を使用して、ページ全体のテキストを解析し編集可能なブロックに変換します。" 
                : "Google Cloud Document AI を使用して、高度なレイアウト解析とテキスト抽出を行います。"}
            </p>
            {isDetecting && (
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-[#E5322E] uppercase tracking-widest">解析中...</span>
                  <span className="text-[8px] font-mono text-[#999]">SCANNING_PIPELINE</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-full bg-gradient-to-r from-[#E5322E] to-[#FF6B6B]"
                    transition={{ duration: 12, ease: "linear" }}
                  />
                </div>
              </div>
            )}
            {docAIError && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-md text-[8px] text-red-700 font-medium">
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5">⚠️</span>
                  <div>
                    <p>{docAIError}</p>
                    <p className="mt-1 opacity-70 italic">※ Gemini による代わりの解析を継続します</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[#999] font-bold uppercase tracking-[0.15em]">AI 設定</label>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="gemini-only"
                  checked={useGeminiOnly}
                  onChange={(e) => setUseGeminiOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#E5322E] cursor-pointer"
                />
                <label htmlFor="gemini-only" className="text-[9px] text-[#666] font-bold cursor-pointer">Gemini のみ</label>
              </div>
            </div>
            
            {!useGeminiOnly && (
              <div className="space-y-3 p-4 bg-white rounded-xl border border-[#D1D1D1] shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] text-[#666] font-bold uppercase">プロジェクトID</label>
                    <a href="https://console.cloud.google.com/projectselector2/home/dashboard" target="_blank" className="text-[8px] text-[#E5322E] hover:underline">GCP</a>
                  </div>
                  <div className="relative">
                    <input 
                      type={showProjectId ? "text" : "password"} 
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="例: my-project-id"
                      className={cn(
                        "w-full text-[10px] font-mono border rounded-md pl-3 pr-9 py-2 outline-none transition-all",
                        !projectId ? 'border-amber-300 bg-amber-50' : 'border-[#D1D1D1] focus:border-[#E5322E] bg-white'
                      )}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowProjectId(!showProjectId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#E5322E] transition-colors"
                    >
                      {showProjectId ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                  {!projectId && (
                    <p className="text-[8px] text-amber-700 font-bold mt-1">
                      ⚠️ プロジェクトIDを入力してください
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] text-[#666] font-bold uppercase">プロセッサーID</label>
                    <a href="https://console.cloud.google.com/ai/document-ai/processors" target="_blank" className="text-[8px] text-[#E5322E] hover:underline">作成</a>
                  </div>
                  <div className="relative">
                    <input 
                      type={showProcessorId ? "text" : "password"} 
                      value={processorId}
                      onChange={(e) => setProcessorId(e.target.value)}
                      placeholder="例: 8294184ec60f19aa"
                      className="w-full text-[10px] font-mono border border-[#D1D1D1] rounded-md pl-3 pr-9 py-2 outline-none focus:border-[#E5322E] bg-white transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowProcessorId(!showProcessorId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#E5322E] transition-colors"
                    >
                      {showProcessorId ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#666] font-bold uppercase">ロケーション</label>
                  <select 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-[10px] border border-[#D1D1D1] rounded-md px-3 py-2 outline-none focus:border-[#E5322E] bg-white transition-all"
                  >
                    <option value="us">US (米国)</option>
                    <option value="eu">EU (欧州)</option>
                    <option value="asia-southeast1">Asia Southeast 1 (シンガポール)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/detect', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                            projectId, 
                            processorId, 
                            location 
                          })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert("✅ 接続成功！Document AI は正常に動作しています。");
                        } else {
                          alert(`❌ 接続失敗: ${data.details || data.error}\n\nコード: ${data.code || 'N/A'}`);
                        }
                      } catch (err: any) {
                        alert(`❌ 通信エラー: ${err.message}`);
                      }
                    }}
                    className="w-full py-2 bg-[#F8F9FA] hover:bg-[#F0F0F0] text-[#333] text-[10px] font-bold rounded-md border border-[#D1D1D1] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Sparkles size={11} className="text-[#E5322E]" />
                    接続テストを実行
                  </button>
                </div>
                
                {processorId === '3b937c607d71ab20' && (
                  <div className="mt-2 p-2.5 bg-green-50 rounded-lg border border-green-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-green-700 uppercase tracking-wider">プロセッサー情報</span>
                      <span className="text-[7px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">ACTIVE</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] text-green-800 font-mono">
                      <span className="opacity-60">NAME:</span> <span className="font-bold">ocr</span>
                      <span className="opacity-60">TYPE:</span> <span className="font-bold">Document OCR</span>
                      <span className="opacity-60">REGION:</span> <span className="font-bold">asia-southeast1</span>
                    </div>
                  </div>
                )}
                <p className="text-[7px] text-[#999] leading-tight">
                  ※ Document AI を使用するには、GCP サービスアカウントに <b>Document AI API User</b> ロールが必要です。
                </p>
                <div className="p-1.5 bg-amber-50 border border-amber-100 rounded text-[7px] text-amber-800">
                  <b>💡 ヒント:</b> プロジェクトIDはサービスアカウントのドメイン（@以降）の最初の部分（例: <b>aisanbo</b>）と一致している必要があります。
                </div>
              </div>
            )}
            
            {useGeminiOnly && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                <p className="text-[9px] text-blue-700 leading-relaxed font-medium">
                  <b>Gemini のみモード:</b> Document AI を使用せず、Gemini の視覚能力のみでテキストを抽出します。GCP の設定が不要で、すぐに試せます。
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={confirmAll}
              disabled={isDetecting || annotations.filter(a => a.page === currentPage && a.type === 'ai-edit').length === 0}
              className="col-span-2 bg-[#1A1A1A] text-white text-[10px] font-bold py-3.5 rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              <Save size={13} />
              すべての AI 編集を確定
            </button>
            <button 
              onClick={detectTextStandard}
              disabled={isDetecting}
              className="col-span-2 bg-white border border-[#D1D1D1] text-[#333] text-[10px] font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <MousePointer2 size={13} />
              原本からテキストを抽出 (非AI)
            </button>
            <button 
              onClick={detectTextVision}
              disabled={isDetecting}
              className="col-span-2 bg-white border border-[#D1D1D1] text-[#333] text-[10px] font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Eye size={13} />
              Vision API でテキスト抽出
            </button>
            <button 
              onClick={() => detectTextAI()}
              disabled={isDetecting}
              className="bg-[#E5322E] text-white text-[10px] font-bold py-3.5 rounded-xl hover:bg-[#C42B28] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-red-100"
            >
              {isDetecting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Save size={12} />
                </motion.div>
              ) : <Sparkles size={13} />}
              ページ全体を解析
            </button>
            <button 
              onClick={() => {
                if (selectedIds.length > 0) {
                  detectTextAI(selectedIds);
                }
              }}
              disabled={isDetecting || selectedIds.length === 0}
              className="bg-[#1A1A1A] text-white text-[10px] font-bold py-3.5 rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              選択範囲を解析
            </button>
            <button 
              onClick={() => addToQueue(selectedIds)}
              disabled={isDetecting || selectedIds.length === 0}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[10px] font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              キューに追加 ({selectedIds.length})
            </button>
            <button 
              onClick={processQueue}
              disabled={isDetecting || analysisQueue.length === 0}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[10px] font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              キューを実行 ({analysisQueue.length})
            </button>
            <button 
              onClick={smartFormatAI}
              disabled={isDetecting || annotations.filter(a => a.page === currentPage).length === 0}
              className="col-span-2 bg-white border border-[#E5322E] text-[#E5322E] text-[10px] font-bold py-3.5 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Type size={13} />
              スマート書式 (AI)
            </button>
            <button 
              onClick={verifyAccuracy}
              disabled={isDetecting || isVerifying || annotations.filter(a => a.page === currentPage).length === 0}
              className="col-span-2 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-[10px] font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isVerifying ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Save size={12} />
                </motion.div>
              ) : <Search size={13} />}
              AI 精度検証 (ハルシネーション検出)
            </button>

            <button 
              onClick={clearAnnotations}
              className="col-span-2 bg-white border border-red-200 text-red-600 text-[10px] font-bold py-3.5 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Trash2 size={13} />
              現在のアノテーションをクリア
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-[#D1D1D1] flex justify-between items-center">
          <div className="flex gap-1.5">
            <button className="p-2.5 bg-white border border-[#D1D1D1] hover:bg-[#F0F0F0] rounded-lg transition-all text-[#666] shadow-sm"><Undo2 size={16} /></button>
            <button className="p-2.5 bg-white border border-[#D1D1D1] hover:bg-[#F0F0F0] rounded-lg transition-all text-[#666] shadow-sm"><Redo2 size={16} /></button>
          </div>
          <button className="text-[10px] font-bold text-[#E5322E] hover:underline uppercase tracking-widest">履歴をクリア</button>
        </div>
      </div>

      <div className="p-5 bg-white border-t border-[#D1D1D1]">
        <button 
          onClick={viewMode === 'css' ? printCssPdf : downloadPdf}
          disabled={!pdfFile}
          className="w-full bg-[#E5322E] text-white text-sm font-bold py-4 rounded-xl hover:bg-[#C42B28] transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {viewMode === 'css' ? "PDF出力 (CSS)" : "変更を保存してダウンロード"} <ChevronRight size={18} />
        </button>
      </div>
    </aside>
  );
};

function FormatButton({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-1.5 border rounded flex items-center justify-center transition-all",
        active ? "bg-[#E5322E] text-white border-[#E5322E] shadow-sm" : "bg-white border-[#D1D1D1] hover:bg-[#F0F0F0] text-[#666]"
      )}
    >
      {icon}
    </button>
  );
}
