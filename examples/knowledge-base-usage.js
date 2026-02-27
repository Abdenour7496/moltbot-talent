/**
 * Example: Using Moltbot Talent Knowledge Base
 *
 * This example demonstrates how to:
 * 1. Initialize a knowledge base
 * 2. Ingest documents from a directory
 * 3. Query the knowledge base
 * 4. Build context for LLM injection
 */
import { KnowledgeBase } from '@moltbot-talent/knowledge';
async function main() {
    // 1. Create a knowledge base for IT Operations
    const kb = new KnowledgeBase({
        id: 'it-ops-kb',
        name: 'IT Operations Knowledge Base',
        domain: 'it-ops',
        // Use Chroma for vector storage (local)
        vectorDb: {
            provider: 'chroma',
            url: './data/chroma',
            collection: 'it-ops-runbooks',
        },
        // Use OpenAI embeddings
        embedding: {
            model: 'text-embedding-3-small',
            apiKey: process.env.OPENAI_API_KEY,
        },
        // Chunking configuration
        chunking: {
            chunkSize: 1000,
            chunkOverlap: 200,
        },
        // Retrieval configuration
        retrieval: {
            topK: 5,
            minScore: 0.7,
        },
    });
    try {
        // 2. Ingest documents from the runbooks directory
        console.log('Ingesting documents...');
        const chunksIngested = await kb.ingest('./examples/knowledge/runbooks', {
            category: 'runbook',
            recursive: true,
        });
        console.log(`Ingested ${chunksIngested} chunks`);
        // 3. Query the knowledge base
        const query = 'How do I restart the payment service?';
        console.log(`\nQuery: "${query}"`);
        const results = await kb.query(query);
        console.log(`\nFound ${results.length} relevant results:`);
        for (const result of results) {
            console.log(`\n[Score: ${(result.score * 100).toFixed(0)}%] ${result.chunk.metadata.title}`);
            console.log(`Source: ${result.chunk.metadata.source}`);
            console.log(`Preview: ${result.chunk.content.slice(0, 200)}...`);
        }
        // 4. Build context for LLM
        const context = kb.buildContext(results);
        console.log('\n--- LLM Context ---');
        console.log(context);
        console.log('--- End Context ---');
        // 5. Example of how this would be used in a Moltbot agent
        const systemPromptAddition = `
You are an IT Operations Specialist. Use the following knowledge to help answer questions.

${context}

Always cite your sources when providing information from the knowledge base.
`;
        console.log('\n--- System Prompt Addition ---');
        console.log(systemPromptAddition);
        // 6. Get knowledge base stats
        const stats = await kb.getStats();
        console.log('\n--- Knowledge Base Stats ---');
        console.log(`Documents: ${stats.documentCount}`);
        console.log(`Chunks: ${stats.chunkCount}`);
    }
    finally {
        // Clean up
        await kb.close();
    }
}
// Run if called directly
main().catch(console.error);
//# sourceMappingURL=knowledge-base-usage.js.map