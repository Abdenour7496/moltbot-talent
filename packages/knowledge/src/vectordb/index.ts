import type { DocumentChunk, VectorDBProvider, EmbeddingModel, SearchResult } from '../types.js';

/**
 * Configuration for the vector store
 */
export interface VectorStoreConfig {
  /** Vector database provider */
  provider: VectorDBProvider;
  /** Connection URL or path */
  url?: string;
  /** API key for cloud providers */
  apiKey?: string;
  /** Collection/index name */
  collection: string;
  /** Embedding model to use */
  embeddingModel: EmbeddingModel;
  /** Embedding API key */
  embeddingApiKey?: string;
  /** Embedding dimensions (auto-detected if not specified) */
  dimensions?: number;
}

/**
 * Statistics about the vector store
 */
export interface VectorStoreStats {
  documentCount: number;
  chunkCount: number;
  lastUpdated?: Date;
}

/**
 * Abstract base class for vector store implementations
 */
abstract class VectorStoreBase {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract upsert(chunks: DocumentChunk[]): Promise<void>;
  abstract search(query: string, options: { topK: number; filter?: Record<string, unknown> }): Promise<SearchResult[]>;
  abstract delete(ids: string[]): Promise<void>;
  abstract clear(): Promise<void>;
  abstract getStats(): Promise<VectorStoreStats>;
}

/**
 * Chroma vector store implementation
 */
class ChromaVectorStore extends VectorStoreBase {
  private config: VectorStoreConfig;
  private client: any; // ChromaClient
  private collection: any; // Collection
  private embedFunction: any;

  constructor(config: VectorStoreConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const { ChromaClient, OpenAIEmbeddingFunction } = await import('chromadb');
      
      // Initialize Chroma client
      this.client = new ChromaClient({
        path: this.config.url ?? 'http://localhost:8000',
      });
      
      // Initialize embedding function
      this.embedFunction = new OpenAIEmbeddingFunction({
        openai_api_key: this.config.embeddingApiKey ?? process.env.OPENAI_API_KEY ?? '',
        openai_model: this.config.embeddingModel,
      });
      
      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.config.collection,
        embeddingFunction: this.embedFunction,
        metadata: { 'hnsw:space': 'cosine' },
      });
    } catch (error) {
      throw new Error(`Failed to connect to Chroma: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    // Chroma doesn't require explicit disconnect
    this.client = null;
    this.collection = null;
  }

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    if (!this.collection) {
      throw new Error('Not connected to Chroma');
    }
    
    if (chunks.length === 0) return;
    
    // Batch upsert in groups of 100
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      await this.collection.upsert({
        ids: batch.map(c => c.id),
        documents: batch.map(c => c.content),
        metadatas: batch.map(c => ({
          documentId: c.documentId,
          chunkIndex: c.chunkIndex,
          totalChunks: c.totalChunks,
          source: c.metadata.source,
          title: c.metadata.title ?? '',
          contentType: c.metadata.contentType,
          domain: c.metadata.domain ?? '',
          category: c.metadata.category ?? '',
        })),
      });
    }
  }

  async search(
    query: string,
    options: { topK: number; filter?: Record<string, unknown> }
  ): Promise<SearchResult[]> {
    if (!this.collection) {
      throw new Error('Not connected to Chroma');
    }
    
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: options.topK,
      where: options.filter as any,
    });
    
    if (!results.ids?.[0]) {
      return [];
    }
    
    const searchResults: SearchResult[] = [];
    
    for (let i = 0; i < results.ids[0].length; i++) {
      const id = results.ids[0][i];
      const document = results.documents?.[0]?.[i] ?? '';
      const metadata = results.metadatas?.[0]?.[i] ?? {};
      const distance = results.distances?.[0]?.[i] ?? 0;
      
      // Convert distance to similarity score (cosine distance to similarity)
      const score = 1 - distance;
      
      searchResults.push({
        chunk: {
          id,
          documentId: metadata.documentId as string ?? '',
          content: document,
          chunkIndex: metadata.chunkIndex as number ?? 0,
          totalChunks: metadata.totalChunks as number ?? 1,
          metadata: {
            source: metadata.source as string ?? '',
            title: metadata.title as string,
            contentType: metadata.contentType as string ?? '',
            domain: metadata.domain as string,
            category: metadata.category as string,
          },
        },
        score,
        distance,
      });
    }
    
    return searchResults;
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.collection) {
      throw new Error('Not connected to Chroma');
    }
    
    await this.collection.delete({ ids });
  }

  async clear(): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to Chroma');
    }
    
    // Delete and recreate collection
    await this.client.deleteCollection({ name: this.config.collection });
    this.collection = await this.client.getOrCreateCollection({
      name: this.config.collection,
      embeddingFunction: this.embedFunction,
      metadata: { 'hnsw:space': 'cosine' },
    });
  }

  async getStats(): Promise<VectorStoreStats> {
    if (!this.collection) {
      throw new Error('Not connected to Chroma');
    }
    
    const count = await this.collection.count();
    
    return {
      documentCount: 0, // Would need separate tracking
      chunkCount: count,
    };
  }
}

/**
 * In-memory vector store for testing and development
 */
class InMemoryVectorStore extends VectorStoreBase {
  private chunks: Map<string, DocumentChunk> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private config: VectorStoreConfig;

  constructor(config: VectorStoreConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    // No-op for in-memory
  }

  async disconnect(): Promise<void> {
    // No-op for in-memory
  }

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
      // Generate simple embedding (in production, use actual embedding API)
      const embedding = this.simpleEmbed(chunk.content);
      this.embeddings.set(chunk.id, embedding);
    }
  }

  async search(
    query: string,
    options: { topK: number; filter?: Record<string, unknown> }
  ): Promise<SearchResult[]> {
    const queryEmbedding = this.simpleEmbed(query);
    
    const results: Array<{ id: string; score: number }> = [];
    
    for (const [id, embedding] of this.embeddings) {
      const chunk = this.chunks.get(id);
      if (!chunk) continue;
      
      // Apply filters
      if (options.filter) {
        let matches = true;
        for (const [key, value] of Object.entries(options.filter)) {
          if ((chunk.metadata as any)[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }
      
      const score = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({ id, score });
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Return top K
    return results.slice(0, options.topK).map(({ id, score }) => ({
      chunk: this.chunks.get(id)!,
      score,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.chunks.delete(id);
      this.embeddings.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.chunks.clear();
    this.embeddings.clear();
  }

  async getStats(): Promise<VectorStoreStats> {
    const documentIds = new Set([...this.chunks.values()].map(c => c.documentId));
    return {
      documentCount: documentIds.size,
      chunkCount: this.chunks.size,
    };
  }

  /**
   * Simple embedding for testing (bag of words)
   */
  private simpleEmbed(text: string): number[] {
    const words = text.toLowerCase().split(/\W+/);
    const embedding = new Array(256).fill(0);
    
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
      }
      const index = Math.abs(hash) % 256;
      embedding[index] += 1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

/**
 * VectorStore factory class
 */
export class VectorStore extends VectorStoreBase {
  private implementation: VectorStoreBase;
  private config: VectorStoreConfig;

  constructor(config: VectorStoreConfig) {
    super();
    this.config = config;
    
    // Select implementation based on provider
    switch (config.provider) {
      case 'chroma':
        this.implementation = new ChromaVectorStore(config);
        break;
      // Add other providers here (qdrant, pinecone, pgvector)
      default:
        // Default to in-memory for development
        console.warn(`Unknown provider '${config.provider}', using in-memory store`);
        this.implementation = new InMemoryVectorStore(config);
    }
  }

  async connect(): Promise<void> {
    return this.implementation.connect();
  }

  async disconnect(): Promise<void> {
    return this.implementation.disconnect();
  }

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    return this.implementation.upsert(chunks);
  }

  async search(
    query: string,
    options: { topK: number; filter?: Record<string, unknown> }
  ): Promise<SearchResult[]> {
    return this.implementation.search(query, options);
  }

  async delete(ids: string[]): Promise<void> {
    return this.implementation.delete(ids);
  }

  async clear(): Promise<void> {
    return this.implementation.clear();
  }

  async getStats(): Promise<VectorStoreStats> {
    return this.implementation.getStats();
  }
}

export default VectorStore;
