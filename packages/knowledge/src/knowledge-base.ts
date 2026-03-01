import { DocumentIngester, type IngestionConfig } from './ingestion/index.js';
import { VectorStore, type VectorStoreConfig } from './vectordb/index.js';
import { RAGRetriever, type RetrievalConfig, type RetrievalResult } from './retrieval/index.js';
import type { Document, DocumentChunk, EmbeddingModel, VectorDBProvider } from './types.js';

/**
 * Configuration for the KnowledgeBase
 */
export interface KnowledgeBaseConfig {
  /** Unique identifier for this knowledge base */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Domain/persona this knowledge base serves */
  domain: string;
  
  /** Vector database configuration */
  vectorDb: {
    provider: VectorDBProvider;
    /** Connection URL or path */
    url?: string;
    /** API key for cloud providers */
    apiKey?: string;
    /** Collection/index name */
    collection?: string;
  };
  
  /** Embedding model configuration */
  embedding: {
    model: EmbeddingModel;
    /** API key for embedding service */
    apiKey?: string;
    /** Dimensions (auto-detected if not specified) */
    dimensions?: number;
  };
  
  /** Chunking configuration */
  chunking?: {
    /** Target chunk size in characters */
    chunkSize?: number;
    /** Overlap between chunks */
    chunkOverlap?: number;
    /** Separator pattern for splitting */
    separators?: string[];
  };
  
  /** Retrieval configuration */
  retrieval?: {
    /** Number of results to retrieve */
    topK?: number;
    /** Minimum similarity threshold */
    minScore?: number;
    /** Enable reranking */
    rerank?: boolean;
  };
}

/**
 * KnowledgeBase - Main orchestrator for the RAG pipeline
 * 
 * Manages document ingestion, vector storage, and retrieval for
 * domain-specific knowledge that powers AI Virtual Talent personas.
 * 
 * @example
 * ```typescript
 * const kb = new KnowledgeBase({
 *   id: 'it-ops-kb',
 *   name: 'IT Operations Knowledge Base',
 *   domain: 'it-ops',
 *   vectorDb: { provider: 'chroma', url: './data/chroma' },
 *   embedding: { model: 'text-embedding-3-small' }
 * });
 * 
 * // Ingest documents
 * await kb.ingest('./runbooks');
 * 
 * // Query the knowledge base
 * const results = await kb.query('How do I restart the payment service?');
 * ```
 */
export class KnowledgeBase {
  private config: KnowledgeBaseConfig;
  private ingester: DocumentIngester;
  private vectorStore: VectorStore;
  private retriever: RAGRetriever;
  private initialized = false;

  constructor(config: KnowledgeBaseConfig) {
    this.config = config;
    
    // Initialize components with config
    this.ingester = new DocumentIngester({
      chunkSize: config.chunking?.chunkSize ?? 1000,
      chunkOverlap: config.chunking?.chunkOverlap ?? 200,
      separators: config.chunking?.separators,
    });
    
    this.vectorStore = new VectorStore({
      provider: config.vectorDb.provider,
      url: config.vectorDb.url,
      apiKey: config.vectorDb.apiKey,
      collection: config.vectorDb.collection ?? config.id,
      embeddingModel: config.embedding.model,
      embeddingApiKey: config.embedding.apiKey,
      dimensions: config.embedding.dimensions,
    });
    
    this.retriever = new RAGRetriever({
      vectorStore: this.vectorStore,
      topK: config.retrieval?.topK ?? 5,
      minScore: config.retrieval?.minScore ?? 0.7,
      rerank: config.retrieval?.rerank ?? false,
    });
  }

  /**
   * Initialize the knowledge base (connect to vector DB, etc.)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.vectorStore.connect();
    this.initialized = true;
  }

  /**
   * Ingest documents from a source path
   * 
   * @param sourcePath - Path to file or directory
   * @param options - Ingestion options
   * @returns Number of chunks ingested
   */
  async ingest(
    sourcePath: string,
    options?: {
      category?: string;
      recursive?: boolean;
      fileTypes?: string[];
    }
  ): Promise<number> {
    await this.initialize();
    
    // Process documents
    const documents = await this.ingester.processPath(sourcePath, {
      domain: this.config.domain,
      category: options?.category,
      recursive: options?.recursive ?? true,
      fileTypes: options?.fileTypes,
    });
    
    // Chunk documents
    const chunks: DocumentChunk[] = [];
    for (const doc of documents) {
      const docChunks = await this.ingester.chunkDocument(doc);
      chunks.push(...docChunks);
    }
    
    // Store in vector database
    await this.vectorStore.upsert(chunks);
    
    return chunks.length;
  }

  /**
   * Query the knowledge base
   * 
   * @param query - Natural language query
   * @param options - Query options
   * @returns Retrieved results with context
   */
  async query(
    query: string,
    options?: {
      topK?: number;
      minScore?: number;
      filter?: Record<string, unknown>;
    }
  ): Promise<RetrievalResult[]> {
    await this.initialize();
    
    return this.retriever.retrieve(query, {
      topK: options?.topK,
      minScore: options?.minScore,
      filter: options?.filter,
    });
  }

  /**
   * Build context for LLM from retrieved results
   * 
   * @param results - Retrieved results
   * @returns Formatted context string for injection into prompt
   */
  buildContext(results: RetrievalResult[]): string {
    if (results.length === 0) {
      return '';
    }
    
    const contextParts = results.map((result, index) => {
      const { chunk, score } = result;
      const source = chunk.metadata.title ?? chunk.metadata.source;
      const category = chunk.metadata.category ?? 'document';

      return `[Source ${index + 1}: ${source} (${category}, relevance: ${(score * 100).toFixed(0)}%, chunk_id: ${chunk.id}, doc_id: ${chunk.documentId})]
${chunk.content}`;
    });
    
    return `<knowledge_context domain="${this.config.domain}">
${contextParts.join('\n\n')}
</knowledge_context>`;
  }

  /**
   * Get statistics about the knowledge base
   */
  async getStats(): Promise<{
    id: string;
    name: string;
    domain: string;
    documentCount: number;
    chunkCount: number;
    lastUpdated?: Date;
  }> {
    await this.initialize();
    
    const stats = await this.vectorStore.getStats();
    
    return {
      id: this.config.id,
      name: this.config.name,
      domain: this.config.domain,
      documentCount: stats.documentCount,
      chunkCount: stats.chunkCount,
      lastUpdated: stats.lastUpdated,
    };
  }

  /**
   * Delete all documents from the knowledge base
   */
  async clear(): Promise<void> {
    await this.initialize();
    await this.vectorStore.clear();
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.vectorStore.disconnect();
    this.initialized = false;
  }
}
