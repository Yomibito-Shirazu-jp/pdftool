import express from "express";
import { createServer as createViteServer } from "vite";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Document AI Client
  let docAIClient: DocumentProcessorServiceClient;
  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
      : undefined;
      
    docAIClient = new DocumentProcessorServiceClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
    console.log("Document AI Client Initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Document AI Client:", err);
    // Fallback to default initialization if JSON parsing fails
    docAIClient = new DocumentProcessorServiceClient();
  }

  // API: Document AI Detection
  app.post("/api/detect", async (req, res) => {
    try {
      const { image, processorId, projectId, location } = req.body;
      console.log(`Processing request for Project: ${projectId}, Processor: ${processorId}`);
      
      const effectiveProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT_ID;
      const effectiveLocation = location || process.env.GOOGLE_CLOUD_LOCATION || "us";
      const effectiveProcessorId = processorId || process.env.DOCUMENT_AI_PROCESSOR_ID;

      if (!effectiveProcessorId) {
        return res.status(400).json({ error: "Document AI Processor ID is missing. Please set it in .env or provide it in the request." });
      }

      const name = `projects/${effectiveProjectId}/locations/${effectiveLocation}/processors/${effectiveProcessorId}`;
      
      const request = {
        name,
        rawDocument: {
          content: image,
          mimeType: "image/jpeg",
        },
      };

      const [result] = await docAIClient.processDocument(request);
      const { document } = result;

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
      console.error("Document AI Error:", error);
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
