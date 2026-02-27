# Enterprise Common Skill

Shared patterns, workflows, and integrations used across all enterprise AI Virtual Talent personas.

## Overview

This skill provides common enterprise capabilities:
- Approval workflow management
- Audit logging
- Enterprise authentication patterns
- Communication templates
- Escalation frameworks
- Compliance helpers

## Installation

This skill is automatically included when any enterprise persona is activated.

## Approval Workflows

### Workflow Types

**Immediate (Auto-Approved):**
- Read-only operations
- Status queries
- Documentation generation
- Non-production environments

**Standard Approval:**
- Production changes
- Resource modifications
- User communications
- Expense-generating actions

**Escalated Approval:**
- Security-impacting changes
- Data deletion
- Access modifications
- Policy exceptions

### Approval Request Format

```
🔐 APPROVAL REQUIRED
━━━━━━━━━━━━━━━━━━

Action: [Description of action]
Type: Standard | Escalated
Risk: Low | Medium | High
Reversible: Yes | No

Impact:
• [Impact item 1]
• [Impact item 2]

Alternatives Considered:
• [Alternative 1] - [Why not chosen]

Recommended: [Yes/No with rationale]

Reply with:
• ✅ "approve" to proceed
• ❌ "deny" to cancel
• ❓ "explain more" for details
```

### Approval Tracking

All approvals are logged with:
- Timestamp
- Approver identity
- Action approved
- Context/rationale
- Outcome

---

## Audit Logging

### Log Format

```json
{
  "timestamp": "2026-01-29T14:32:00Z",
  "persona": "it-ops-specialist",
  "session_id": "sess_abc123",
  "action": "service_restart",
  "target": "payment-service",
  "approval": {
    "required": true,
    "granted_by": "user@company.com",
    "granted_at": "2026-01-29T14:31:45Z"
  },
  "outcome": "success",
  "details": {
    "command": "systemctl restart payment-service",
    "duration_ms": 2340
  }
}
```

### Audit Categories

| Category | Retention | Examples |
|----------|-----------|----------|
| Security | 7 years | Access changes, auth events |
| Financial | 7 years | Purchases, approvals |
| Operational | 90 days | Commands, queries |
| Communication | 1 year | Messages sent |

---

## Communication Templates

### Status Update

```
📊 STATUS UPDATE: [Topic]
━━━━━━━━━━━━━━━━━━━━━━━

Status: 🟢 On Track | 🟡 At Risk | 🔴 Blocked
Last Updated: [Timestamp]

Summary:
[2-3 sentence summary]

Key Points:
• [Point 1]
• [Point 2]
• [Point 3]

Next Steps:
• [Action 1] — [Owner] — [Due]

Questions? Reply to this message.
```

### Escalation Notice

```
⚠️ ESCALATION: [Topic]
━━━━━━━━━━━━━━━━━━━━

Escalated To: [Person/Team]
Escalated By: [AI Persona]
Reason: [Brief reason]
Urgency: Immediate | Today | This Week

Context:
[Background information]

What's Needed:
[Specific ask]

Supporting Information:
• [Link/reference 1]
• [Link/reference 2]

Original Request: [Link to thread]
```

### Handoff

```
🔄 HANDOFF: [Topic]
━━━━━━━━━━━━━━━━━━

From: [AI Persona / Human]
To: [Human / Team]
Reason: [Why handoff is needed]

Context Summary:
[What was discussed/attempted]

Current State:
[Where things stand]

Recommendations:
• [Suggestion 1]
• [Suggestion 2]

Attached Context:
• [Relevant documents/links]

The receiving party has full context of this conversation.
```

---

## Escalation Framework

### When to Escalate

**Always Escalate:**
- Security incidents or suspected breaches
- Data loss or corruption
- Compliance violations
- Customer data at risk
- Legal or regulatory issues
- Harassment or safety concerns

**Consider Escalating:**
- Exceeded time threshold without resolution
- Requires expertise outside persona's domain
- Involves policy exceptions
- High financial impact
- Multiple stakeholder conflicts

### Escalation Paths

```
┌─────────────────────────────────────────────────┐
│                 ESCALATION MATRIX               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Technical Issues                               │
│  └─► Team Lead → Engineering Manager → VP Eng  │
│                                                 │
│  Security Issues                                │
│  └─► Security Team → CISO → Executive Team     │
│                                                 │
│  Customer Issues                                │
│  └─► Support Lead → Customer Success → VP CS   │
│                                                 │
│  Financial Issues                               │
│  └─► Finance Team → Controller → CFO           │
│                                                 │
│  Legal/Compliance                               │
│  └─► Legal Team → General Counsel → CEO        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Compliance Helpers

### Data Handling Reminders

When handling sensitive data:
- ⚠️ Never log PII in conversation
- ⚠️ Never store credentials
- ⚠️ Mask sensitive fields in examples
- ⚠️ Confirm data classification before sharing
- ⚠️ Follow data retention policies

### Regulatory Awareness

| Regulation | Triggers | Action |
|------------|----------|--------|
| GDPR | EU user data | Data minimization, consent verification |
| HIPAA | Health information | PHI handling protocols |
| PCI-DSS | Payment data | Never store, log, or display full card numbers |
| SOX | Financial records | Maintain audit trail |

### Compliance Disclaimer

When providing information that may have compliance implications:

```
ℹ️ COMPLIANCE NOTE
This information is provided for operational guidance only.
For authoritative compliance interpretation, please consult
your Legal/Compliance team.
```

---

## Enterprise Authentication

### Supported Methods

- **SAML 2.0** — Enterprise SSO
- **OIDC** — OAuth-based authentication
- **API Keys** — Service-to-service
- **mTLS** — Certificate-based

### Session Management

- Sessions tied to authenticated user
- Automatic timeout after inactivity
- Cannot impersonate other users
- Actions attributed to authorizing user

---

## Rate Limiting

### Default Limits

| Action Type | Limit | Window |
|-------------|-------|--------|
| API calls | 100 | Per minute |
| Emails sent | 10 | Per hour |
| Tickets created | 20 | Per hour |
| File uploads | 50 MB | Per session |

### Handling Rate Limits

When limits are reached:
1. Inform the user of the limit
2. Suggest alternatives (batch, schedule)
3. Offer to queue for later
4. Escalate if urgent

---

## Error Handling

### Standard Error Response

```
❌ ACTION FAILED
━━━━━━━━━━━━━━━

Action: [What was attempted]
Error: [What went wrong]
Code: [Error code if applicable]

Possible Causes:
• [Cause 1]
• [Cause 2]

Suggested Next Steps:
• [Step 1]
• [Step 2]

Need help? I can [alternative action] or escalate to [team].
```

### Graceful Degradation

When integrations fail:
1. Acknowledge the failure
2. Attempt alternative approaches
3. Provide partial information if available
4. Suggest manual workarounds
5. Offer to retry or escalate

---

## Multi-Tenant Awareness

When operating in multi-tenant environments:
- Never cross tenant boundaries
- Verify tenant context before actions
- Use tenant-specific configurations
- Respect data isolation
