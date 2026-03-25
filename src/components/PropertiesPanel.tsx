import React from 'react';
import { Settings, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, ChevronRight, Sparkles, Save, Type, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { Annotation } from '../types';
import { FONTS, COLORS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

interface PropertiesPanelProps {
  selectedId: string | null;
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  setSelectedId: (id: string | null) => void;
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
  detectTextAI: () => void;
  smartFormatAI: () => void;
  verifyAccuracy: () => void;
  isVerifying: boolean;
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
  comparingVersionId?: string;
  toggleCompareVersion: (version: any) => void;
  processorId: string;
  setProcessorId: (id: string) => void;
  projectId: string;
  setProjectId: (id: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedId,
  annotations,
  setAnnotations,
  setSelectedId,
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
  comparingVersionId,
  toggleCompareVersion,
  processorId,
  setProcessorId,
  projectId,
  setProjectId
}) => {
  const selected = annotations.find(a => a.id === selectedId);

  return (
    <aside className="w-80 bg-white border-l border-[#D1D1D1] flex flex-col z-10 hidden xl:flex">
      <div className="p-4 border-b border-[#D1D1D1] flex items-center justify-between bg-[#F8F9FA]">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-[#666]">プロパティ</span>
          {user && <span className="text-[9px] text-[#999] truncate max-w-[120px]">{user.email}</span>}
        </div>
        <div className="flex gap-1">
          {!user ? (
            <button 
              onClick={login}
              className="text-[10px] font-bold text-[#E5322E] hover:bg-red-50 px-2 py-1 rounded transition-colors border border-[#E5322E]"
            >
              ログイン
            </button>
          ) : (
            <button className="p-1.5 hover:bg-[#E0E0E0] rounded transition-colors text-[#666]"><Settings size={14} /></button>
          )}
          {selectedId && (
            <button 
              onClick={() => { setAnnotations(annotations.filter(a => a.id !== selectedId)); setSelectedId(null); }} 
              className="text-[#E5322E] hover:bg-red-50 p-1.5 rounded transition-colors"
              title="削除"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        {/* Version History Section */}
        {user && pdfFile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-widest">バージョン履歴</h3>
              <button 
                onClick={() => setIsVersionHistoryOpen(!isVersionHistoryOpen)}
                className="text-[10px] font-bold text-[#E5322E] hover:underline"
              >
                {isVersionHistoryOpen ? '閉じる' : '表示'}
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
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                    <input 
                      type="text" 
                      placeholder="バージョン名を入力..."
                      className="w-full text-[10px] border border-[#D1D1D1] rounded px-2 py-1.5 outline-none focus:border-[#E5322E]"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                    />
                    <button 
                      onClick={saveVersion}
                      disabled={isSavingVersion || !versionName.trim()}
                      className="w-full bg-[#E5322E] text-white text-[10px] font-bold py-1.5 rounded disabled:opacity-50"
                    >
                      {isSavingVersion ? '保存中...' : '現在の状態を保存'}
                    </button>
                  </div>

                  {/* Versions List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {versions.length === 0 ? (
                      <p className="text-[10px] text-[#999] text-center py-4 italic">保存されたバージョンはありません</p>
                    ) : (
                      versions.map((v) => (
                        <div key={v.id} className="group p-2 bg-white border border-[#D1D1D1] rounded hover:border-[#E5322E] transition-all">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-[#333] truncate pr-2">{v.name}</span>
                            <button 
                              onClick={() => deleteVersion(v.id)}
                              className="text-[#999] hover:text-[#E5322E] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-[#999]">
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
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-widest">テキストスタイル</h3>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[#999] font-medium">フォント</label>
              <select 
                className="w-full text-xs border border-[#D1D1D1] rounded px-3 py-2 outline-none bg-[#F8F9FA] focus:border-[#E5322E] transition-colors"
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

            <div className="space-y-1">
              <label className="text-[10px] text-[#999] font-medium">サイズ</label>
              <div className="flex gap-2">
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
                  className="flex-1 h-1.5 bg-[#E0E0E0] rounded-lg appearance-none cursor-pointer accent-[#E5322E] mt-3"
                />
                <input 
                  type="number" 
                  className="w-12 text-xs border border-[#D1D1D1] rounded px-2 py-1 outline-none text-center"
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
            <label className="text-[10px] text-[#999] font-medium">書式</label>
            <div className="flex items-center gap-1">
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
              <div className="w-[1px] h-4 bg-[#D1D1D1] mx-1" />
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

          {/* Color Selection */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-widest">カラー</h3>
            <div className="grid grid-cols-6 gap-2">
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
            <div className="space-y-4 pt-4 border-t border-[#D1D1D1]">
              <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-widest">CSS 組版 (個別設定)</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#999] font-medium text-xs">クラス名 (Class Name)</label>
                  <input 
                    type="text" 
                    placeholder="例: main-title, chapter-header"
                    className="w-full text-xs border border-[#D1D1D1] rounded px-3 py-2 outline-none bg-[#F8F9FA] focus:border-[#E5322E] transition-colors"
                    value={selected?.className || ''}
                    onChange={(e) => {
                      const className = e.target.value;
                      setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, className } : a));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#999] font-medium text-xs">カスタム CSS (Inline CSS)</label>
                  <textarea 
                    placeholder="例: font-variant: small-caps; letter-spacing: 2px;"
                    className="w-full text-xs border border-[#D1D1D1] rounded px-3 py-2 outline-none bg-[#F8F9FA] focus:border-[#E5322E] transition-colors h-24 font-mono resize-none"
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
        <div className="pt-6 border-t border-[#D1D1D1] space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-[#E5322E]">
              <Sparkles size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Document AI マッピング</span>
            </div>
            <p className="text-[10px] text-red-800 leading-relaxed">
              ページ全体を解析し、すべてのテキストを編集可能なブロックに自動変換します。
            </p>
            {isDetecting && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-red-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-full bg-[#E5322E]"
                    transition={{ duration: 5, ease: "linear" }}
                  />
                </div>
                <span className="text-[8px] font-bold text-[#E5322E] uppercase">解析中</span>
              </div>
            )}
          </div>
            <div className="space-y-2">
              <label className="text-[9px] text-[#999] font-bold uppercase tracking-wider">Document AI 設定</label>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[8px] text-[#666]">プロジェクトID</label>
                  <input 
                    type="text" 
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="GCP Project ID"
                    className="w-full text-[10px] border border-[#D1D1D1] rounded px-2 py-1.5 outline-none focus:border-[#E5322E]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-[#666]">プロセッサーID</label>
                  <input 
                    type="text" 
                    value={processorId}
                    onChange={(e) => setProcessorId(e.target.value)}
                    placeholder="Document AI Processor ID"
                    className="w-full text-[10px] border border-[#D1D1D1] rounded px-2 py-1.5 outline-none focus:border-[#E5322E]"
                  />
                </div>
              </div>
            </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={detectTextAI}
              disabled={isDetecting}
              className="bg-[#E5322E] text-white text-[10px] font-bold py-3 rounded-lg hover:bg-[#C42B28] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {isDetecting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Save size={12} />
                </motion.div>
              ) : <Sparkles size={12} />}
              自動マッピング
            </button>
            <button 
              onClick={smartFormatAI}
              disabled={isDetecting || annotations.filter(a => a.page === currentPage).length === 0}
              className="bg-white border border-[#E5322E] text-[#E5322E] text-[10px] font-bold py-3 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Type size={12} />
              スマート書式
            </button>
            <button 
              onClick={verifyAccuracy}
              disabled={isDetecting || isVerifying || annotations.filter(a => a.page === currentPage).length === 0}
              className="col-span-2 bg-white border border-blue-600 text-blue-600 text-[10px] font-bold py-3 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isVerifying ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Save size={12} />
                </motion.div>
              ) : <Search size={12} />}
              AI 精度検証 (ハルシネーション検出)
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#D1D1D1] flex justify-between items-center">
          <div className="flex gap-1">
            <button className="p-2 hover:bg-[#F0F0F0] rounded transition-colors text-[#666]"><Undo2 size={16} /></button>
            <button className="p-2 hover:bg-[#F0F0F0] rounded transition-colors text-[#666]"><Redo2 size={16} /></button>
          </div>
          <button className="text-[10px] font-bold text-[#E5322E] hover:underline">履歴をクリア</button>
        </div>
      </div>

      <div className="p-4 bg-[#F8F9FA] border-t border-[#D1D1D1]">
        <button 
          onClick={viewMode === 'css' ? printCssPdf : downloadPdf}
          disabled={!pdfFile}
          className="w-full bg-[#E5322E] text-white text-sm font-bold py-3.5 rounded-xl hover:bg-[#C42B28] transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {viewMode === 'css' ? "PDF出力 (CSS)" : "変更を保存してダウンロード"} <ChevronRight size={16} />
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
