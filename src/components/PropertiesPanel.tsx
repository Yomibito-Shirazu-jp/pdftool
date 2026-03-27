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
      
      {/* ========== SCROLLABLE CONTENT ========== */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">

        {/* ===== #1 PRIMARY: PDF解析 ===== */}
        <div className="bg-white p-4 rounded-xl border border-[#D1D1D1] space-y-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#E5322E]" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#E5322E]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A1A1A]">PDF 解析</span>
            </div>
            <div className={cn(
              "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border",
              isDetecting ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" : 
              (docAIError ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-600 border-green-200")
            )}>
              {isDetecting ? "BUSY" : (docAIError ? "FALLBACK" : "READY")}
            </div>
          </div>
          {isDetecting && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-gradient-to-r from-[#E5322E] to-[#FF6B6B]" transition={{ duration: 12, ease: "linear" }} />
            </div>
          )}
          {docAIError && <div className="p-2 bg-red-50 border border-red-100 rounded text-[8px] text-red-700">⚠️ {docAIError}</div>}
          <button onClick={() => detectTextAI()} disabled={isDetecting}
            className="w-full bg-[#E5322E] text-white text-[12px] font-bold py-4 rounded-xl hover:bg-[#C42B28] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-100">
            {isDetecting ? (<motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Save size={14} /></motion.div>) : <Sparkles size={15} />}
            ページ全体を解析
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { if (selectedIds.length > 0) detectTextAI(selectedIds); }} disabled={isDetecting || selectedIds.length === 0}
              className="bg-[#1A1A1A] text-white text-[10px] font-bold py-2.5 rounded-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
              選択範囲を解析
            </button>
            <button onClick={confirmAll} disabled={isDetecting || annotations.filter(a => a.page === currentPage && a.type === 'ai-edit').length === 0}
              className="bg-[#1A1A1A] text-white text-[10px] font-bold py-2.5 rounded-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Save size={11} /> AI編集を確定
            </button>
          </div>
        </div>

        {/* ===== #2 テキスト編集（選択時のみ表示） ===== */}
        {selectedId && (selected?.type === 'text' || selected?.type === 'ai-edit') && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1 h-1 bg-[#E5322E] rounded-full" /> テキスト編集
            </h3>
            <div className="space-y-3 bg-white p-4 rounded-xl border border-[#D1D1D1] shadow-sm">
              <textarea 
                className="w-full text-xs border border-[#D1D1D1] rounded-md px-3 py-2 outline-none bg-white focus:border-[#E5322E] focus:ring-1 focus:ring-red-100 transition-all min-h-[60px] resize-y"
                value={selected?.content || ''}
                onChange={(e) => { const content = e.target.value; setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, content } : a)); }}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#666] font-bold uppercase">フォント</label>
                  <select className="w-full text-[10px] border border-[#D1D1D1] rounded px-2 py-1.5 outline-none bg-white focus:border-[#E5322E]"
                    value={selected?.fontFamily || currentFontFamily}
                    onChange={(e) => { const f = e.target.value; setCurrentFontFamily(f); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontFamily: f } : a)); }}>
                    {FONTS.map(font => <option key={font}>{font}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#666] font-bold uppercase">サイズ</label>
                  <input type="number" className="w-full text-[10px] font-mono border border-[#D1D1D1] rounded px-2 py-1.5 outline-none text-center bg-white focus:border-[#E5322E]"
                    value={selected?.fontSize || currentFontSize}
                    onChange={(e) => { const s = parseInt(e.target.value); setCurrentFontSize(s); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontSize: s } : a)); }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex bg-white border border-[#D1D1D1] rounded-md p-0.5">
                  <FormatButton icon={<Bold size={13} />} active={isBold} onClick={() => { const v = !isBold; setIsBold(v); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontWeight: v ? 'bold' : 'normal' } : a)); }} />
                  <FormatButton icon={<Italic size={13} />} active={isItalic} onClick={() => { const v = !isItalic; setIsItalic(v); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, fontStyle: v ? 'italic' : 'normal' } : a)); }} />
                  <FormatButton icon={<Underline size={13} />} active={isUnderline} onClick={() => { const v = !isUnderline; setIsUnderline(v); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textDecoration: v ? 'underline' : 'none' } : a)); }} />
                </div>
                <div className="flex bg-white border border-[#D1D1D1] rounded-md p-0.5">
                  <FormatButton icon={<AlignLeft size={13} />} active={currentTextAlign === 'left'} onClick={() => { setCurrentTextAlign('left'); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textAlign: 'left' } : a)); }} />
                  <FormatButton icon={<AlignCenter size={13} />} active={currentTextAlign === 'center'} onClick={() => { setCurrentTextAlign('center'); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textAlign: 'center' } : a)); }} />
                  <FormatButton icon={<AlignRight size={13} />} active={currentTextAlign === 'right'} onClick={() => { setCurrentTextAlign('right'); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, textAlign: 'right' } : a)); }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => { setCurrentColor(c); if (selectedId) setAnnotations(annotations.map(a => a.id === selectedId ? { ...a, color: c } : a)); }}
                    className={cn("w-5 h-5 rounded-full border-2 transition-all", currentColor === c ? "border-[#E5322E] scale-110" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== #3 ツール ===== */}
        <div className="space-y-2 pt-3 border-t border-[#E8E8E8]">
          <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1 h-1 bg-[#999] rounded-full" /> ツール
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={detectTextStandard} disabled={isDetecting}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[9px] font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm">
              <MousePointer2 size={11} /> テキスト抽出
            </button>
            <button onClick={detectTextVision} disabled={isDetecting}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[9px] font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm">
              <Eye size={11} /> Vision API
            </button>
            <button onClick={smartFormatAI} disabled={isDetecting || annotations.filter(a => a.page === currentPage).length === 0}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[9px] font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm">
              <Type size={11} /> スマート書式
            </button>
            <button onClick={verifyAccuracy} disabled={isDetecting || isVerifying || annotations.filter(a => a.page === currentPage).length === 0}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[9px] font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm">
              {isVerifying ? (<motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Save size={10} /></motion.div>) : <Search size={11} />}
              精度検証
            </button>
            <button onClick={() => addToQueue(selectedIds)} disabled={isDetecting || selectedIds.length === 0}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[9px] font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm">
              キューに追加 ({selectedIds.length})
            </button>
            <button onClick={processQueue} disabled={isDetecting || analysisQueue.length === 0}
              className="bg-white border border-[#D1D1D1] text-[#333] text-[9px] font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm">
              キューを実行 ({analysisQueue.length})
            </button>
            <button onClick={clearAnnotations}
              className="col-span-2 bg-white border border-red-200 text-red-500 text-[9px] font-bold py-2 rounded-lg hover:bg-red-50 transition-all flex items-center justify-center gap-1.5">
              <Trash2 size={11} /> アノテーションをクリア
            </button>
          </div>
        </div>

        {/* ===== #4 バージョン履歴（折り畳み） ===== */}
        {user && pdfFile && (
          <details className="pt-3 border-t border-[#E8E8E8]">
            <summary className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em] cursor-pointer hover:text-[#666] flex items-center gap-2 list-none">
              <div className="w-1 h-1 bg-[#999] rounded-full" /> バージョン履歴
            </summary>
            <div className="mt-3 space-y-2">
              <div className="p-3 bg-white rounded-lg border border-[#D1D1D1] space-y-2 shadow-sm">
                <input type="text" placeholder="バージョン名を入力..." className="w-full text-[10px] border border-[#D1D1D1] rounded px-2 py-2 outline-none focus:border-[#E5322E] transition-all" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
                <button onClick={saveVersion} disabled={isSavingVersion || !versionName.trim()} className="w-full bg-[#E5322E] text-white text-[10px] font-bold py-2 rounded-md disabled:opacity-50 hover:bg-[#C42B28] transition-colors shadow-sm">
                  {isSavingVersion ? '保存中...' : '現在の状態を保存'}
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {versions.length === 0 ? (
                  <p className="text-[9px] text-[#999] text-center py-3">保存されたバージョンはありません</p>
                ) : (
                  versions.map((v: any) => (
                    <div key={v.id} className="p-2.5 bg-white rounded-lg border border-[#D1D1D1] shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-[#333]">{v.name || 'unnamed'}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleCompareVersion(v)} className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded transition-colors", comparingVersionId === v.id ? "bg-yellow-500 text-white" : "text-[#666] hover:bg-[#F0F0F0]")}>
                            {comparingVersionId === v.id ? "比較中" : "比較"}
                          </button>
                          <button onClick={() => revertToVersion(v)} className="text-[8px] font-bold text-[#E5322E] hover:underline">復元</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </details>
        )}

        {/* ===== #5 AI設定（折り畳み） ===== */}
        <details className="pt-3 border-t border-[#E8E8E8]">
          <summary className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em] cursor-pointer hover:text-[#666] flex items-center gap-2 list-none">
            <Settings size={10} /> AI 設定
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="gemini-only" checked={useGeminiOnly} onChange={(e) => setUseGeminiOnly(e.target.checked)} className="w-3.5 h-3.5 accent-[#E5322E] cursor-pointer" />
              <label htmlFor="gemini-only" className="text-[9px] text-[#666] font-bold cursor-pointer">Gemini のみ</label>
            </div>
            {!useGeminiOnly && (
              <div className="space-y-2 p-3 bg-white rounded-lg border border-[#D1D1D1] shadow-sm">
                <div className="space-y-1">
                  <label className="text-[8px] text-[#666] font-bold uppercase">プロジェクトID</label>
                  <div className="flex items-center gap-1">
                    <input type={showProjectId ? "text" : "password"} value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex-1 text-[9px] font-mono border border-[#D1D1D1] rounded px-2 py-1.5 outline-none focus:border-[#E5322E] bg-white" />
                    <button onClick={() => setShowProjectId(!showProjectId)} className="p-1 text-[#999] hover:text-[#666]">{showProjectId ? <EyeOff size={10} /> : <Eye size={10} />}</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-[#666] font-bold uppercase">プロセッサID</label>
                  <div className="flex items-center gap-1">
                    <input type={showProcessorId ? "text" : "password"} value={processorId} onChange={(e) => setProcessorId(e.target.value)} className="flex-1 text-[9px] font-mono border border-[#D1D1D1] rounded px-2 py-1.5 outline-none focus:border-[#E5322E] bg-white" />
                    <button onClick={() => setShowProcessorId(!showProcessorId)} className="p-1 text-[#999] hover:text-[#666]">{showProcessorId ? <EyeOff size={10} /> : <Eye size={10} />}</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] text-[#666] font-bold uppercase">ロケーション</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full text-[9px] border border-[#D1D1D1] rounded px-2 py-1.5 outline-none focus:border-[#E5322E] bg-white">
                    <option value="us">US (米国)</option>
                    <option value="eu">EU (欧州)</option>
                  </select>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await fetch('/api/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", projectId, processorId, location }) });
                    const data = await res.json();
                    if (res.ok) { alert("✅ 接続成功！"); } else { alert(`❌ 接続失敗: ${data.details || data.error}`); }
                  } catch (err: any) { alert(`❌ 通信エラー: ${err.message}`); }
                }} className="w-full py-2 bg-[#F8F9FA] hover:bg-[#F0F0F0] text-[#333] text-[9px] font-bold rounded border border-[#D1D1D1] flex items-center justify-center gap-1.5">
                  <Sparkles size={10} className="text-[#E5322E]" /> 接続テスト
                </button>
              </div>
            )}
            {useGeminiOnly && (
              <p className="text-[8px] text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                <b>Gemini のみモード:</b> Document AI を使用せず、Gemini でテキストを抽出します。
              </p>
            )}
          </div>
        </details>
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
