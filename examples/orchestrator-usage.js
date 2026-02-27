/**
 * Example: Using the Talent Orchestrator
 *
 * This example demonstrates how to:
 * 1. Initialize the orchestrator
 * 2. Load an IT Operations persona
 * 3. Build context for agent turns
 * 4. Handle approval workflows
 */
import { TalentOrchestrator } from '@moltbot-talent/knowledge/orchestrator';
import { join } from 'path';
async function main() {
    // 1. Create the orchestrator
    const orchestrator = new TalentOrchestrator('example-session');
    try {
        // 2. Load the IT Operations persona
        console.log('Loading IT Operations persona...');
        await orchestrator.loadPersona({
            id: 'it-ops',
            name: 'IT Operations Specialist',
            path: join(__dirname, '../personas/it-ops-specialist'),
            knowledge: {
                id: 'it-ops-kb',
                name: 'IT Ops Knowledge',
                domain: 'it-ops',
                vectorDb: {
                    provider: 'chroma',
                    url: './data/chroma',
                },
                embedding: {
                    model: 'text-embedding-3-small',
                    apiKey: process.env.OPENAI_API_KEY,
                },
            },
            integrations: ['servicenow', 'pagerduty', 'datadog'],
            skills: ['it-ops', 'enterprise-common'],
        });
        // Activate the persona
        orchestrator.setActivePersona('it-ops');
        console.log('Persona activated!');
        // 3. Build context for a user query
        const userQuery = 'The payment service is throwing errors. What should I do?';
        console.log(`\nUser query: "${userQuery}"`);
        const context = await orchestrator.buildContext(userQuery);
        console.log('\n--- Built Context ---');
        console.log(`System prompt length: ${context.systemPrompt.length} chars`);
        console.log(`Knowledge context length: ${context.knowledgeContext.length} chars`);
        console.log(`Available tools: ${context.tools.join(', ')}`);
        console.log(`Approval required: ${context.approvalRequired}`);
        // Show a snippet of the system prompt
        console.log('\n--- System Prompt Preview ---');
        console.log(context.systemPrompt.slice(0, 500) + '...');
        // 4. Demonstrate approval workflow
        console.log('\n--- Approval Workflow Demo ---');
        // Request approval for a production action
        const approval = orchestrator.requestApproval({
            action: 'restart_payment_service',
            description: 'Rolling restart of payment-service deployment',
            risk: 'medium',
            reversible: true,
            context: {
                deployment: 'payment-service',
                namespace: 'payments',
                reason: 'High error rate detected',
            },
        });
        console.log(`Approval requested: ${approval.id}`);
        console.log(`Pending approvals: ${orchestrator.getPendingApprovals().length}`);
        // Simulate user granting approval
        console.log('\nSimulating approval grant...');
        orchestrator.grantApproval(approval.id, 'admin@company.com');
        console.log(`Approval granted! Pending: ${orchestrator.getPendingApprovals().length}`);
        // 5. Show audit log
        console.log('\n--- Audit Log ---');
        const auditLog = orchestrator.getAuditLog({ limit: 10 });
        for (const entry of auditLog) {
            console.log(`[${entry.timestamp.toISOString()}] ${entry.action} - ${entry.outcome}`);
        }
        // 6. Example of how this integrates with Moltbot
        console.log('\n--- Integration Pattern ---');
        console.log(`
To integrate with Moltbot, add this to your moltbot.json:

{
  "talent": {
    "persona": "it-ops-specialist",
    "personaPath": "./personas/it-ops-specialist",
    "knowledge": {
      "sources": ["./knowledge/runbooks", "./knowledge/procedures"],
      "vectorDb": "chroma"
    },
    "integrations": ["servicenow", "pagerduty"]
  }
}

Then in your AGENTS.md or agent configuration, inject the persona context
before each turn using the TalentOrchestrator.buildContext() method.
`);
    }
    finally {
        // Clean up
        await orchestrator.shutdown();
    }
}
// Run if called directly
main().catch(console.error);
//# sourceMappingURL=orchestrator-usage.js.map