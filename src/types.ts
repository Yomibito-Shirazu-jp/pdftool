import { pdfjs } from './App';

export type Tool = 'select' | 'hand' | 'text' | 'rect' | 'circle' | 'pen' | 'edit';

export interface Annotation {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'pen' | 'ai-edit';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  points?: { x: number; y: number }[];
  css?: string;
  className?: string;
  maskBackground?: boolean;
  isConfirmed?: boolean;
  dbBlockId?: string;
  opacity?: number;
}

export interface TextBlock {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface VerificationIssue {
  id: string;
  type: 'hallucination' | 'discrepancy' | 'missing' | 'ocr_error';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
  blockId?: string;
  location?: { x: number; y: number; width: number; height: number };
}

export interface VerificationReport {
  timestamp: string;
  issues: VerificationIssue[];
  summary: string;
  accuracyScore: number;
}
