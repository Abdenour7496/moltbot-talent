import { z } from 'zod';

/**
 * Metadata associated with a document
 */
export interface DocumentMetadata {
  /** Original source path or URL */
  source: string;
  /** Document title */
  title?: string;
  /** Content type (pdf, docx, md, html, etc.) */
  contentType: string;
  /** Domain/persona this document belongs to */
  domain?: string;
  /** Document category (runbook, procedure, policy, etc.) */
  category?: string;
  /** Last modified timestamp */
  lastModified?: Date;
  /** Custom metadata fields */
  custom?: Record<string, unknown>;
}

/**
 * A full document before chunking
 */
export interface Document {
  /** Unique document identifier */
  id: string;
  /** Full document content */
  content: string;
  /** Document metadata */
  metadata: DocumentMetadata;
}

/**
 * A chunk of a document for embedding
 */
export interface DocumentChunk {
  /** Unique chunk identifier */
  id: string;
  /** Parent document ID */
  documentId: string;
  /** Chunk content */
  content: string;
  /** Chunk index within document */
  chunkIndex: number;
  /** Total chunks in document */
  totalChunks: number;
  /** Metadata inherited from parent document */
  metadata: DocumentMetadata;
  /** Embedding vector (populated after embedding) */
  embedding?: number[];
}

/**
 * Zod schemas for runtime validation
 */
export const DocumentMetadataSchema = z.object({
  source: z.string(),
  title: z.string().optional(),
  contentType: z.string(),
  domain: z.string().optional(),
  category: z.string().optional(),
  lastModified: z.date().optional(),
  custom: z.record(z.unknown()).optional(),
});

export const DocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: DocumentMetadataSchema,
});

export const DocumentChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  content: z.string(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  metadata: DocumentMetadataSchema,
  embedding: z.array(z.number()).optional(),
});

/**
 * Query result from vector search
 */
export interface SearchResult {
  /** Matching chunk */
  chunk: DocumentChunk;
  /** Similarity score (0-1, higher is better) */
  score: number;
  /** Distance metric value */
  distance?: number;
}

/**
 * Supported embedding models
 */
export type EmbeddingModel = 
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002'
  | 'voyage-large-2'
  | 'voyage-code-2';

/**
 * Supported vector database providers
 */
export type VectorDBProvider = 'chroma' | 'qdrant' | 'pinecone' | 'pgvector';
