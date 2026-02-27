import type { VectorStore } from '../vectordb/index.js';
import type { DocumentChunk, SearchResult } from '../types.js';

/**
 * Configuration for the RAG retriever
 */
export interface RetrievalConfig {
  /** Vector store instance */
  vectorStore: VectorStore;
  /** Number of results to retrieve */
  topK: number;
  /** Minimum similarity threshold (0-1) */
  minScore: number;
  /** Enable reranking with cross-encoder */
  rerank: boolean;
  /** Reranking model (if rerank is true) */
  rerankModel?: string;
}

/**
 * Result from RAG retrieval
 */
export interface RetrievalResult {
  /** Retrieved chunk */
  chunk: DocumentChunk;
  /** Similarity score (0-1) */
  score: number;
  /** Whether this was included after reranking */
  reranked?: boolean;
}

/**
 * Query expansion strategies
 */
export type ExpansionStrategy = 'none' | 'hypothetical' | 'multi-query';

/**
 * RAGRetriever - Retrieval-Augmented Generation pipeline
 * 
 * Handles:
 * - Query expansion and preprocessing
 * - Vector similarity search
 * - Result filtering and ranking
 * - Optional reranking with cross-encoders
 */
export class RAGRetriever {
  private config: RetrievalConfig;

  constructor(config: RetrievalConfig) {
    this.config = config;
  }

  /**
   * Retrieve relevant chunks for a query
   * 
   * @param query - Natural language query
   * @param options - Retrieval options
   * @returns Array of retrieval results
   */
  async retrieve(
    query: string,
    options?: {
      topK?: number;
      minScore?: number;
      filter?: Record<string, unknown>;
      expansion?: ExpansionStrategy;
    }
  ): Promise<RetrievalResult[]> {
    const topK = options?.topK ?? this.config.topK;
    const minScore = options?.minScore ?? this.config.minScore;
    
    // Preprocess query
    const processedQuery = this.preprocessQuery(query);
    
    // Expand query if requested
    const queries = options?.expansion && options.expansion !== 'none'
      ? await this.expandQuery(processedQuery, options.expansion)
      : [processedQuery];
    
    // Search with each query and deduplicate
    const allResults: Map<string, RetrievalResult> = new Map();
    
    for (const q of queries) {
      const searchResults = await this.config.vectorStore.search(q, {
        topK: topK * 2, // Fetch more for filtering
        filter: options?.filter,
      });
      
      for (const result of searchResults) {
        const existing = allResults.get(result.chunk.id);
        if (!existing || result.score > existing.score) {
          allResults.set(result.chunk.id, {
            chunk: result.chunk,
            score: result.score,
          });
        }
      }
    }
    
    // Convert to array and filter by minimum score
    let results = Array.from(allResults.values())
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    // Rerank if enabled
    if (this.config.rerank && results.length > 0) {
      results = await this.rerank(query, results);
    }
    
    return results;
  }

  /**
   * Preprocess the query for better retrieval
   */
  private preprocessQuery(query: string): string {
    // Basic preprocessing
    return query
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase();
  }

  /**
   * Expand query into multiple queries for better recall
   */
  private async expandQuery(
    query: string,
    strategy: ExpansionStrategy
  ): Promise<string[]> {
    switch (strategy) {
      case 'hypothetical':
        // Generate hypothetical document that would answer the query
        // This would typically use an LLM call
        return [query]; // Placeholder
        
      case 'multi-query':
        // Generate multiple query variations
        // This would typically use an LLM call
        return [
          query,
          // Could add variations like:
          // `What is ${query}?`,
          // `How to ${query}?`,
          // `${query} documentation`,
        ];
        
      default:
        return [query];
    }
  }

  /**
   * Rerank results using cross-encoder
   */
  private async rerank(
    query: string,
    results: RetrievalResult[]
  ): Promise<RetrievalResult[]> {
    // Placeholder for cross-encoder reranking
    // In production, this would call a reranking model
    // like ms-marco-MiniLM-L-12-v2 or Cohere rerank
    
    // For now, just mark results as not reranked
    return results.map(r => ({
      ...r,
      reranked: false,
    }));
  }

  /**
   * Retrieve with MMR (Maximal Marginal Relevance) for diversity
   * 
   * @param query - Natural language query
   * @param options - MMR options
   * @returns Diverse set of retrieval results
   */
  async retrieveMMR(
    query: string,
    options?: {
      topK?: number;
      fetchK?: number;
      lambda?: number;
      filter?: Record<string, unknown>;
    }
  ): Promise<RetrievalResult[]> {
    const topK = options?.topK ?? this.config.topK;
    const fetchK = options?.fetchK ?? topK * 4;
    const lambda = options?.lambda ?? 0.5; // Balance between relevance and diversity
    
    // Fetch more results initially
    const results = await this.config.vectorStore.search(query, {
      topK: fetchK,
      filter: options?.filter,
    });
    
    if (results.length === 0) {
      return [];
    }
    
    // Apply MMR selection
    const selected: RetrievalResult[] = [];
    const remaining = [...results];
    
    // Select first result (most relevant)
    selected.push({
      chunk: remaining[0].chunk,
      score: remaining[0].score,
    });
    remaining.shift();
    
    // Iteratively select remaining results
    while (selected.length < topK && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Calculate MMR score
        const relevance = candidate.score;
        const maxSimilarity = Math.max(
          ...selected.map(s => this.textSimilarity(candidate.chunk.content, s.chunk.content))
        );
        
        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }
      
      selected.push({
        chunk: remaining[bestIndex].chunk,
        score: remaining[bestIndex].score,
      });
      remaining.splice(bestIndex, 1);
    }
    
    return selected;
  }

  /**
   * Simple text similarity (Jaccard) for MMR
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\W+/));
    const wordsB = new Set(b.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return intersection.size / union.size;
  }
}

export default RAGRetriever;
