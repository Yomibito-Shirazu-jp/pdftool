import express from "express";
import { createServer as createViteServer } from "vite";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Supabase client (server-side with service_role key)
const supabaseUrl = process.env.SUPABASE_URL || 'https://avakiygdyafqjrhlvbjg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

  // API: Document AI Detection
  app.post("/api/detect", async (req, res) => {
    try {
      const { image, processorId, projectId, location } = req.body;
      
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
      
      // us 以外の場合はリージョン指定のエンドポイントが必要
      if (effectiveLocation && effectiveLocation !== 'us') {
        clientOptions.apiEndpoint = `${effectiveLocation}-documentai.googleapis.com`;
      }

      const regionalClient = new DocumentProcessorServiceClient(clientOptions);
      const name = `projects/${effectiveProjectId}/locations/${effectiveLocation}/processors/${effectiveProcessorId}`;
      
      const request = {
        name,
        rawDocument: {
          content: image,
          mimeType: "image/png",
        },
      };

      const [result] = await regionalClient.processDocument(request);
      const { document } = result;
      console.log("Document AI processing completed successfully.");

      // Extract layout and text with fallback mechanisms
      let blocks: any[] = [];

      const page = document?.pages?.[0];
      if (page) {
        // Try paragraphs first (standard for text blocks)
        if (page.paragraphs && page.paragraphs.length > 0) {
          blocks = page.paragraphs.map((p: any) => {
            const vertices = p.layout?.boundingPoly?.normalizedVertices || [];
            const ymin = Math.min(...vertices.map((v: any) => v.y)) * 1000;
            const xmin = Math.min(...vertices.map((v: any) => v.x)) * 1000;
            const ymax = Math.max(...vertices.map((v: any) => v.y)) * 1000;
            const xmax = Math.max(...vertices.map((v: any) => v.x)) * 1000;
            
            const text = document.text?.substring(
              p.layout?.textAnchor?.textSegments?.[0]?.startIndex || 0,
              p.layout?.textAnchor?.textSegments?.[0]?.endIndex || 0
            ).trim();

            return { text, box: [ymin, xmin, ymax, xmax] };
          });
        } 
        // Fallback to lines if no paragraphs
        else if (page.lines && page.lines.length > 0) {
          blocks = page.lines.map((l: any) => {
            const vertices = l.layout?.boundingPoly?.normalizedVertices || [];
            const ymin = Math.min(...vertices.map((v: any) => v.y)) * 1000;
            const xmin = Math.min(...vertices.map((v: any) => v.x)) * 1000;
            const ymax = Math.max(...vertices.map((v: any) => v.y)) * 1000;
            const xmax = Math.max(...vertices.map((v: any) => v.x)) * 1000;

            const text = document.text?.substring(
              l.layout?.textAnchor?.textSegments?.[0]?.startIndex || 0,
              l.layout?.textAnchor?.textSegments?.[0]?.endIndex || 0
            ).trim();

            return { text, box: [ymin, xmin, ymax, xmax] };
          });
        }
        // Fallback to visual elements (some specialized processors use this)
        else if (page.visualElements && page.visualElements.length > 0) {
          blocks = page.visualElements.map((el: any) => {
            const vertices = el.layout?.boundingPoly?.normalizedVertices || [];
            const ymin = Math.min(...vertices.map((v: any) => v.y)) * 1000;
            const xmin = Math.min(...vertices.map((v: any) => v.x)) * 1000;
            const ymax = Math.max(...vertices.map((v: any) => v.y)) * 1000;
            const xmax = Math.max(...vertices.map((v: any) => v.x)) * 1000;

            const text = document.text?.substring(
              el.layout?.textAnchor?.textSegments?.[0]?.startIndex || 0,
              el.layout?.textAnchor?.textSegments?.[0]?.endIndex || 0
            ).trim();

            return { text, box: [ymin, xmin, ymax, xmax] };
          });
        }
      }

      res.json({ blocks: blocks.filter(b => b.text && b.text.length > 0) });
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
      const { data: doc, error: docError } = await supabase
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

        const { error: blocksError } = await supabase
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

      let query = supabase
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

      const { data, error } = await supabase
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

      let query = supabase
        .from('extracted_blocks')
        .update({ is_confirmed: true })
        .eq('document_id', id);

      if (page) query = query.eq('page_number', page);

      const { data, error } = await query.select();
      if (error) throw error;

      // Update document status
      await supabase
        .from('pdf_documents')
        .update({ status: 'confirmed' })
        .eq('id', id);

      res.json({ confirmed_count: data?.length || 0 });
    } catch (error: any) {
      console.error('POST /api/documents/:id/confirm error:', error);
      res.status(500).json({ error: error.message });
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
