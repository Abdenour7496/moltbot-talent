import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { createHash } from 'crypto';
import type { Document, DocumentChunk, DocumentMetadata } from '../types.js';

/**
 * Configuration for document ingestion
 */
export interface IngestionConfig {
  /** Target chunk size in characters */
  chunkSize: number;
  /** Overlap between chunks */
  chunkOverlap: number;
  /** Separator patterns for splitting (in order of preference) */
  separators?: string[];
}

/**
 * Options for processing a path
 */
export interface ProcessOptions {
  /** Domain this document belongs to */
  domain?: string;
  /** Document category */
  category?: string;
  /** Process subdirectories */
  recursive?: boolean;
  /** File extensions to process (e.g., ['.md', '.pdf']) */
  fileTypes?: string[];
}

/**
 * Supported file processors
 */
type FileProcessor = (content: Buffer, path: string) => Promise<string>;

/**
 * DocumentIngester - Processes documents for the knowledge base
 * 
 * Handles:
 * - File discovery and reading
 * - Content extraction from various formats (MD, TXT, PDF, DOCX)
 * - Document chunking with overlap
 * - Metadata extraction
 */
export class DocumentIngester {
  private config: IngestionConfig;
  private processors: Map<string, FileProcessor>;
  
  constructor(config: IngestionConfig) {
    this.config = {
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      separators: config.separators ?? ['\n\n', '\n', '. ', ' ', ''],
    };
    
    // Register file processors
    this.processors = new Map();
    this.registerDefaultProcessors();
  }

  /**
   * Register default file type processors
   */
  private registerDefaultProcessors(): void {
    // Plain text / Markdown
    const textProcessor: FileProcessor = async (content) => content.toString('utf-8');
    this.processors.set('.md', textProcessor);
    this.processors.set('.txt', textProcessor);
    this.processors.set('.text', textProcessor);
    
    // HTML (basic extraction)
    this.processors.set('.html', async (content) => {
      const html = content.toString('utf-8');
      // Basic HTML to text conversion (strips tags)
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    });
    
    // JSON (pretty print)
    this.processors.set('.json', async (content) => {
      try {
        const obj = JSON.parse(content.toString('utf-8'));
        return JSON.stringify(obj, null, 2);
      } catch {
        return content.toString('utf-8');
      }
    });
    
    // PDF (using pdf-parse)
    this.processors.set('.pdf', async (content) => {
      try {
        // Dynamic import to avoid bundling issues
        const pdfParse = await import('pdf-parse');
        const result = await pdfParse.default(content);
        return result.text;
      } catch (error) {
        console.warn('PDF parsing failed, install pdf-parse for PDF support:', error);
        return '';
      }
    });
    
    // DOCX (using mammoth)
    this.processors.set('.docx', async (content) => {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: content });
        return result.value;
      } catch (error) {
        console.warn('DOCX parsing failed, install mammoth for DOCX support:', error);
        return '';
      }
    });
  }

  /**
   * Register a custom file processor
   */
  registerProcessor(extension: string, processor: FileProcessor): void {
    this.processors.set(extension.toLowerCase(), processor);
  }

  /**
   * Process a file or directory path
   * 
   * @param sourcePath - Path to file or directory
   * @param options - Processing options
   * @returns Array of processed documents
   */
  async processPath(sourcePath: string, options: ProcessOptions = {}): Promise<Document[]> {
    const pathStat = await stat(sourcePath);
    
    if (pathStat.isFile()) {
      const doc = await this.processFile(sourcePath, options);
      return doc ? [doc] : [];
    }
    
    if (pathStat.isDirectory()) {
      return this.processDirectory(sourcePath, options);
    }
    
    return [];
  }

  /**
   * Process a single file
   */
  async processFile(filePath: string, options: ProcessOptions = {}): Promise<Document | null> {
    const ext = extname(filePath).toLowerCase();
    
    // Check if we have a processor for this file type
    const processor = this.processors.get(ext);
    if (!processor) {
      console.warn(`No processor for file type: ${ext}`);
      return null;
    }
    
    // Check file type filter
    if (options.fileTypes && !options.fileTypes.includes(ext)) {
      return null;
    }
    
    try {
      const content = await readFile(filePath);
      const text = await processor(content, filePath);
      
      if (!text.trim()) {
        return null;
      }
      
      const fileStat = await stat(filePath);
      
      // Generate document ID from content hash
      const id = createHash('sha256')
        .update(filePath + text)
        .digest('hex')
        .slice(0, 16);
      
      const metadata: DocumentMetadata = {
        source: filePath,
        title: this.extractTitle(text, filePath),
        contentType: ext.slice(1), // Remove leading dot
        domain: options.domain,
        category: options.category,
        lastModified: fileStat.mtime,
      };
      
      return { id, content: text, metadata };
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Process all files in a directory
   */
  async processDirectory(dirPath: string, options: ProcessOptions = {}): Promise<Document[]> {
    const documents: Document[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      // Skip hidden files/directories
      if (entry.name.startsWith('.')) {
        continue;
      }
      
      if (entry.isFile()) {
        const doc = await this.processFile(fullPath, options);
        if (doc) {
          documents.push(doc);
        }
      } else if (entry.isDirectory() && options.recursive !== false) {
        const subDocs = await this.processDirectory(fullPath, options);
        documents.push(...subDocs);
      }
    }
    
    return documents;
  }

  /**
   * Chunk a document into smaller pieces
   */
  async chunkDocument(document: Document): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const text = document.content;
    
    // Use recursive character text splitter logic
    const textChunks = this.splitText(text);
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunkId = `${document.id}-${i.toString().padStart(4, '0')}`;
      
      chunks.push({
        id: chunkId,
        documentId: document.id,
        content: textChunks[i],
        chunkIndex: i,
        totalChunks: textChunks.length,
        metadata: { ...document.metadata },
      });
    }
    
    return chunks;
  }

  /**
   * Split text using recursive character text splitter algorithm
   */
  private splitText(text: string): string[] {
    const { chunkSize, chunkOverlap, separators } = this.config;
    
    const chunks: string[] = [];
    
    // Recursive splitting function
    const split = (text: string, separatorIndex: number): string[] => {
      if (text.length <= chunkSize) {
        return [text.trim()].filter(Boolean);
      }
      
      if (separatorIndex >= separators!.length) {
        // No more separators, just split at chunk size
        const results: string[] = [];
        for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
          results.push(text.slice(i, i + chunkSize).trim());
        }
        return results.filter(Boolean);
      }
      
      const separator = separators![separatorIndex];
      const parts = separator ? text.split(separator) : [text];
      
      const results: string[] = [];
      let currentChunk = '';
      
      for (const part of parts) {
        const potentialChunk = currentChunk
          ? currentChunk + separator + part
          : part;
        
        if (potentialChunk.length <= chunkSize) {
          currentChunk = potentialChunk;
        } else {
          if (currentChunk) {
            results.push(currentChunk.trim());
          }
          
          if (part.length > chunkSize) {
            // Recursively split with next separator
            results.push(...split(part, separatorIndex + 1));
            currentChunk = '';
          } else {
            currentChunk = part;
          }
        }
      }
      
      if (currentChunk.trim()) {
        results.push(currentChunk.trim());
      }
      
      return results;
    };
    
    // Apply overlap between chunks
    const rawChunks = split(text, 0);
    
    if (chunkOverlap === 0 || rawChunks.length <= 1) {
      return rawChunks;
    }
    
    // Add overlap from previous chunk
    for (let i = 1; i < rawChunks.length; i++) {
      const prevChunk = rawChunks[i - 1];
      const overlap = prevChunk.slice(-chunkOverlap);
      
      // Only add overlap if it doesn't make chunk too large
      if (rawChunks[i].length + overlap.length <= chunkSize * 1.2) {
        rawChunks[i] = overlap + ' ' + rawChunks[i];
      }
    }
    
    return rawChunks;
  }

  /**
   * Extract title from document content or filename
   */
  private extractTitle(content: string, filePath: string): string {
    // Try to extract from markdown H1
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    // Try to extract from first line if it looks like a title
    const firstLine = content.split('\n')[0].trim();
    if (firstLine && firstLine.length < 100 && !firstLine.includes('. ')) {
      return firstLine;
    }
    
    // Fall back to filename
    return basename(filePath, extname(filePath));
  }
}

export default DocumentIngester;
