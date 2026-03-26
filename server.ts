import express from "express";
import { createServer as createViteServer } from "vite";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Supabase client (lazy init - server starts even without key)
const supabaseUrl = process.env.SUPABASE_URL || 'https://avakiygdyafqjrhlvbjg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  app.use(express.json({ limit: '50mb' }));

  // Document AI Client
  let docAIClient: DocumentProcessorServiceClient;
  let visionClient: ImageAnnotatorClient;
  
  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
      : undefined;
      
    docAIClient = new DocumentProcessorServiceClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });

    visionClient = new ImageAnnotatorClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });

    console.log("GCP Clients Initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize GCP Clients:", err);
    // Fallback to default initialization if JSON parsing fails
    docAIClient = new DocumentProcessorServiceClient();
    visionClient = new ImageAnnotatorClient();
  }

  // API: Config - expose Document AI settings to frontend
  app.get("/api/config", (req, res) => {
    res.json({
      processorId: process.env.DOCUMENT_AI_PROCESSOR_ID || '8294184ec60f19aa',
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'aidriven-mastering-fyqu',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasSupabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  });

  // API: Document AI Detection
  app.post("/api/detect", async (req, res) => {
    try {
      const { image, processorId, projectId, location, mimeType, pageNumber } = req.body;
      
      const effectiveProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT_ID;
      const effectiveLocation = location || process.env.GOOGLE_CLOUD_LOCATION || "us";
      const effectiveProcessorId = processorId || process.env.DOCUMENT_AI_PROCESSOR_ID;

      console.log(`Processing request for Project: ${effectiveProjectId}, Location: ${effectiveLocation}, Processor: ${effectiveProcessorId}`);

      if (!effectiveProjectId) {
        return res.status(400).json({ error: "GCP プロジェクトIDが設定されていません。サイドバーで入力するか、環境変数を設定してください。" });
      }

      if (!effectiveProcessorId) {
        return res.status(400).json({ error: "Document AI プロセッサーIDが設定されていません。" });
      }

      // リージョンに応じたエンドポイントの設定
      const clientOptions: any = {};
      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS 
        ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
        : undefined;
      
      if (credentials) clientOptions.credentials = credentials;
      if (effectiveProjectId) clientOptions.projectId = effectiveProjectId;
      
      if (effectiveLocation && effectiveLocation !== 'us') {
        clientOptions.apiEndpoint = `${effectiveLocation}-documentai.googleapis.com`;
      }

      const regionalClient = new DocumentProcessorServiceClient(clientOptions);
      const name = `projects/${effectiveProjectId}/locations/${effectiveLocation}/processors/${effectiveProcessorId}`;
      
      // Detect MIME type: prefer PDF over PNG for better accuracy
      const effectiveMimeType = mimeType || "image/png";
      
      const request: any = {
        name,
        rawDocument: {
          content: image,
          mimeType: effectiveMimeType,
        },
        // Layout Parser options for better Japanese OCR
        processOptions: {
          ocrConfig: {
            enableNativePdfParsing: effectiveMimeType === "application/pdf",
            language: "ja",
            advancedOcrOptions: ["ENABLE_IMAGE_QUALITY_SCORES"],
          },
          // Process specific page if requested
          ...(pageNumber && effectiveMimeType === "application/pdf" ? {
            individualPageSelector: { pages: [pageNumber] }
          } : {})
        }
      };

      const [result] = await regionalClient.processDocument(request);
      const { document } = result;
      console.log(`Document AI completed. Pages: ${document?.pages?.length}, Text length: ${document?.text?.length}`);

      // Extract blocks from ALL pages
      let blocks: any[] = [];

      const pages = document?.pages || [];
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        const currentPageNum = pageNumber || (pageIdx + 1);

        // Prefer blocks > paragraphs > lines for layout accuracy
        const elements = page.blocks?.length ? page.blocks
          : page.paragraphs?.length ? page.paragraphs
          : page.lines?.length ? page.lines
          : page.visualElements || [];

        for (const el of elements) {
          const vertices = el.layout?.boundingPoly?.normalizedVertices || [];
          if (vertices.length === 0) continue;

          const ymin = Math.min(...vertices.map((v: any) => v.y ?? 0)) * 1000;
          const xmin = Math.min(...vertices.map((v: any) => v.x ?? 0)) * 1000;
          const ymax = Math.max(...vertices.map((v: any) => v.y ?? 0)) * 1000;
          const xmax = Math.max(...vertices.map((v: any) => v.x ?? 0)) * 1000;

          // Extract text from textAnchor segments
          let text = '';
          const segments = el.layout?.textAnchor?.textSegments || [];
          for (const seg of segments) {
            const start = Number(seg.startIndex || 0);
            const end = Number(seg.endIndex || 0);
            text += document?.text?.substring(start, end) || '';
          }
          text = text.trim();

          if (text.length > 0) {
            blocks.push({
              text,
              box: [ymin, xmin, ymax, xmax],
              page: currentPageNum,
              confidence: el.layout?.confidence || 0
            });
          }
        }
      }

      res.json({ blocks, pageCount: pages.length, fullText: document?.text });
    } catch (error: any) {
      console.error("Document AI Error Details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      res.status(500).json({ 
        error: "Document AI 処理中にエラーが発生しました。",
        details: error.message,
        code: error.code
      });
    }
  });

  // API: Vision API Detection
  app.post("/api/detect-vision", async (req, res) => {
    try {
      const { image, projectId } = req.body;
      
      const effectiveProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT_ID;

      const clientOptions: any = {};
      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS 
        ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
        : undefined;
      
      if (credentials) clientOptions.credentials = credentials;
      if (effectiveProjectId) clientOptions.projectId = effectiveProjectId;

      const client = new ImageAnnotatorClient(clientOptions);
      
      const [result] = await client.documentTextDetection({
        image: { content: image }
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      let blocks: any[] = [];

      if (fullTextAnnotation && fullTextAnnotation.pages) {
        for (const page of fullTextAnnotation.pages) {
          if (page.blocks) {
            for (const block of page.blocks) {
              if (block.paragraphs) {
                for (const paragraph of block.paragraphs) {
                  const vertices = paragraph.boundingBox?.normalizedVertices || paragraph.boundingBox?.vertices || [];
                  
                  // Vision API returns normalized vertices (0-1) or absolute vertices
                  // We need to handle both and convert to our 0-1000 scale
                  const isNormalized = vertices.length > 0 && vertices[0].x <= 1 && vertices[0].y <= 1;
                  const scale = isNormalized ? 1000 : 1; // If absolute, we'd need image dimensions, but let's assume normalized for now or handle it

                  const ymin = Math.min(...vertices.map((v: any) => v.y || 0)) * (isNormalized ? 1000 : 1);
                  const xmin = Math.min(...vertices.map((v: any) => v.x || 0)) * (isNormalized ? 1000 : 1);
                  const ymax = Math.max(...vertices.map((v: any) => v.y || 0)) * (isNormalized ? 1000 : 1);
                  const xmax = Math.max(...vertices.map((v: any) => v.x || 0)) * (isNormalized ? 1000 : 1);

                  let text = "";
                  if (paragraph.words) {
                    text = paragraph.words.map((w: any) => 
                      w.symbols?.map((s: any) => s.text).join("")
                    ).join(" ");
                  }

                  blocks.push({ text: text.trim(), box: [ymin, xmin, ymax, xmax] });
                }
              }
            }
          }
        }
      }

      res.json({ blocks: blocks.filter(b => b.text && b.text.length > 0) });
    } catch (error: any) {
      console.error("Vision API Error:", error);
      res.status(500).json({ 
        error: "Vision API 処理中にエラーが発生しました。",
        details: error.message
      });
    }
  });

  // ================================================================
  // Supabase CRUD APIs - DB-backed OCR pipeline
  // ================================================================

  // POST /api/documents — Create document + save extracted blocks
  app.post('/api/documents', async (req, res) => {
    try {
      const { firebase_uid, filename, page_count, blocks } = req.body;
      if (!firebase_uid || !filename) {
        return res.status(400).json({ error: 'firebase_uid and filename are required' });
      }

      // Create document record
      const { data: doc, error: docError } = await getSupabase()
        .from('pdf_documents')
        .insert({ firebase_uid, filename, page_count: page_count || 0, status: 'extracted' })
        .select('id')
        .single();

      if (docError) throw docError;

      // Insert blocks if provided
      if (blocks && Array.isArray(blocks) && blocks.length > 0) {
        const blockRecords = blocks.map((b: any, i: number) => ({
          document_id: doc.id,
          page_number: b.page || 1,
          bbox_top: b.box?.[0] ?? 0,
          bbox_left: b.box?.[1] ?? 0,
          bbox_bottom: b.box?.[2] ?? 0,
          bbox_right: b.box?.[3] ?? 0,
          ocr_text: b.text || '',
          gemini_text: b.gemini_text || null,
          font_size: b.fontSize || 12,
          font_family: b.fontFamily || 'Noto Sans JP',
          font_weight: b.fontWeight || 'normal',
          font_style: b.fontStyle || 'normal',
          text_align: b.textAlign || 'left',
          color: b.color || '#000000',
          source: b.source || 'docai',
          confidence: b.confidence || 0,
          sort_order: i
        }));

        const { error: blocksError } = await getSupabase()
          .from('extracted_blocks')
          .insert(blockRecords);

        if (blocksError) throw blocksError;
      }

      res.json({ document_id: doc.id, block_count: blocks?.length || 0 });
    } catch (error: any) {
      console.error('POST /api/documents error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/documents/:id/blocks — Fetch all blocks for a document
  app.get('/api/documents/:id/blocks', async (req, res) => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;

      let query = getSupabase()
        .from('extracted_blocks')
        .select('*')
        .eq('document_id', id)
        .order('page_number')
        .order('sort_order');

      if (page) query = query.eq('page_number', page);

      const { data, error } = await query;
      if (error) throw error;

      res.json({ blocks: data });
    } catch (error: any) {
      console.error('GET /api/documents/:id/blocks error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/blocks/:id — Update a single block (user edit)
  app.patch('/api/blocks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates: any = {};
      
      // Allow updating specific fields
      const allowed = ['user_text', 'gemini_text', 'font_size', 'font_family', 'font_weight', 'font_style', 'text_align', 'color', 'is_confirmed'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data, error } = await getSupabase()
        .from('extracted_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json({ block: data });
    } catch (error: any) {
      console.error('PATCH /api/blocks/:id error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/documents/:id/confirm — Confirm all blocks on a page
  app.post('/api/documents/:id/confirm', async (req, res) => {
    try {
      const { id } = req.params;
      const { page } = req.body;

      let query = getSupabase()
        .from('extracted_blocks')
        .update({ is_confirmed: true })
        .eq('document_id', id);

      if (page) query = query.eq('page_number', page);

      const { data, error } = await query.select();
      if (error) throw error;

      // Update document status
      await getSupabase()
        .from('pdf_documents')
        .update({ status: 'confirmed' })
        .eq('id', id);

      res.json({ confirmed_count: data?.length || 0 });
    } catch (error: any) {
      console.error('POST /api/documents/:id/confirm error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  // POST /api/documents/:id/structure — Gemini text structuring pipeline
  app.post("/api/documents/:id/structure", async (req, res) => {
    try {
      const supabase = getSupabase();
      const documentId = req.params.id;
      const { blocks, pageNumber } = req.body;

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY が設定されていません。" });
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });

      // Prepare OCR text for Gemini
      const ocrText = blocks.map((b: any, i: number) => 
        `[Block ${i + 1}] (box: ${b.box?.join(',')})\n${b.text}`
      ).join('\n\n');

      const prompt = `あなたは印刷・組版の専門家です。以下のOCR抽出テキストを整頓してください。

## 指示
1. 各ブロックを以下のタイプに分類: heading(見出し), body(本文), table(表), note(注記), header(ヘッダー), footer(フッター), page_number(ページ番号)
2. OCRの誤字・脱字を文脈から修正
3. 表データはMarkdownテーブルに変換
4. 読み順（reading_order）を上から下、右から左（縦書きの場合）で付与
5. 原文の意味は絶対に変えない

## 出力形式（JSON配列）
[
  {
    "original_index": 0,
    "block_type": "heading",
    "structured_text": "修正後のテキスト",
    "reading_order": 1
  }
]

## OCR抽出テキスト（${blocks.length}ブロック）
${ocrText}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse JSON from Gemini response
      let structured;
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        structured = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (parseErr) {
        console.error("Gemini response parse error:", parseErr);
        console.error("Response was:", responseText);
        return res.status(500).json({ error: "Gemini応答の解析に失敗しました。", raw: responseText });
      }

      // Update blocks in Supabase with structured data
      const updateResults = [];
      for (const item of structured) {
        const originalBlock = blocks[item.original_index];
        if (!originalBlock) continue;

        // If we have existing block IDs in Supabase, update them
        if (originalBlock.db_id) {
          const { error } = await supabase
            .from('extracted_blocks')
            .update({
              block_type: item.block_type,
              structured_text: item.structured_text,
              reading_order: item.reading_order,
              gemini_text: item.structured_text
            } as any)
            .eq('id', originalBlock.db_id);
          
          if (error) console.warn(`Block update error for ${originalBlock.db_id}:`, error);
        }

        updateResults.push({
          ...item,
          original_text: originalBlock.text,
          box: originalBlock.box
        });
      }

      res.json({ 
        structured: updateResults, 
        count: updateResults.length,
        page: pageNumber 
      });

    } catch (error: any) {
      console.error("Gemini structuring error:", error);
      res.status(500).json({ error: "テキスト整頓中にエラーが発生しました。", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Document AI Pipeline Ready.`);
  });
}

startServer();
