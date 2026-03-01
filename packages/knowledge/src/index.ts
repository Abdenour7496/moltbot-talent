/**
 * @moltbot-talent/knowledge
 * 
 * RAG pipeline and knowledge management for Moltbot Talent.
 * Enables domain expertise through document ingestion, vector embeddings,
 * and semantic retrieval.
 */

export { KnowledgeBase, type KnowledgeBaseConfig } from './knowledge-base.js';
export type { PersonaConfig, LoadedPersona, TurnContext, RetrievedSource, ApprovalRequest, AuditEntry } from './orchestrator.js';
export { TalentOrchestrator } from './orchestrator.js';
export { DocumentIngester, type IngestionConfig } from './ingestion/index.js';
export { VectorStore, type VectorStoreConfig } from './vectordb/index.js';
export { RAGRetriever, type RetrievalConfig, type RetrievalResult } from './retrieval/index.js';

// Re-export types
export type { Document, DocumentChunk, DocumentMetadata } from './types.js';

// Workflow orchestration (Antfarm-inspired multi-agent pipelines)
export { WorkflowEngine, resolveTemplate, parseStepOutput } from './workflow-engine.js';
export type { StepExecutorFn, EscalationHandlerFn, WorkflowEventHandler, WorkflowEvent, WorkflowEngineConfig } from './workflow-engine.js';
export { loadWorkflowFile, loadAllWorkflows, validateWorkflowReferences } from './workflow-loader.js';
export type {
  WorkflowDefinition,
  WorkflowAgent,
  WorkflowStep,
  WorkflowRun,
  WorkflowRunStatus,
  StepExecution,
  StepStatus,
  WorkflowStory,
  StoryStatus,
  AgentRole,
  StepLoopConfig,
  StepFailureConfig,
  TemplateContext,
  ParsedStepOutput,
} from './workflow-types.js';
