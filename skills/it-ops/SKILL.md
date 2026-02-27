# IT Operations Skill

A comprehensive skill for IT infrastructure management, incident response, and system reliability.

## Overview

This skill transforms Moltbot into an IT Operations Specialist capable of:
- Incident triage and response coordination
- System monitoring and health assessment
- Runbook execution and automation
- Change management assistance
- Documentation and knowledge management

## Installation

```bash
moltbot talent install it-ops
```

Or manually:
```bash
cp -r skills/it-ops ~/clawd/skills/
```

## Configuration

Add to your `~/.clawdbot/moltbot.json`:

```json
{
  "talent": {
    "persona": "it-ops-specialist",
    "skills": ["it-ops"],
    "knowledge": {
      "sources": [
        "~/clawd/knowledge/runbooks",
        "~/clawd/knowledge/architecture",
        "~/clawd/knowledge/procedures"
      ]
    },
    "integrations": {
      "servicenow": {
        "instance": "your-instance.service-now.com",
        "enabled": true
      },
      "pagerduty": {
        "enabled": true
      },
      "datadog": {
        "enabled": true
      }
    }
  }
}
```

## Capabilities

### Incident Response

**Triage and Classification:**
```
User: We're getting reports of slow checkout on the website

IT Ops: I'll triage this immediately.

📊 INITIAL ASSESSMENT
━━━━━━━━━━━━━━━━━━━━
Service: Checkout (payment-service)
Impact: User-facing, revenue-affecting
Suggested Severity: SEV-2

I'm checking:
• Service health endpoints
• Recent deployments
• Database connection pool
• External payment provider status

[Executes diagnostic commands]

FINDINGS:
• payment-service: 3/5 pods showing high latency (>2s)
• Database connections: 89/100 (near limit)
• Last deployment: 2 hours ago (v2.3.4)

RECOMMENDED ACTION:
1. Scale connection pool to 150 (requires approval)
2. Add 2 more pods to payment-service
3. Open SEV-2 incident ticket

Shall I proceed with these actions?
```

**Runbook Execution:**
```
User: Run the database connection pool reset runbook

IT Ops: I'll execute the "Database Connection Pool Reset" runbook.

📋 RUNBOOK: db-connection-pool-reset
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pre-checks:
✅ Service is responding (degraded)
✅ No active transactions blocking
✅ Failover available if needed

Proceeding with steps:

Step 1: Graceful connection drain
[Executing: pg_terminate_backend for idle connections]
→ 47 idle connections terminated

Step 2: Reset pool configuration
[Executing: systemctl reload pgbouncer]
→ Configuration reloaded

Step 3: Verify recovery
[Executing: health check]
→ Response time: 145ms (within threshold)

RESULT: ✅ Success
Connection pool reset complete. Monitoring for 5 minutes.

Current metrics:
• Active connections: 34/150
• Response time: 145ms
• Error rate: 0%
```

### System Health Assessment

**On-Demand Health Check:**
```
User: What's the current health of our production environment?

IT Ops: Running comprehensive health assessment...

🏥 PRODUCTION HEALTH REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: 2026-01-29 14:32 UTC

COMPUTE
├─ Web Tier: ✅ Healthy (12/12 instances)
├─ API Tier: ⚠️ Warning (8/10 instances, 2 high CPU)
├─ Worker Tier: ✅ Healthy (6/6 instances)
└─ Kubernetes: ✅ Healthy (all nodes ready)

DATABASES
├─ Primary PostgreSQL: ✅ Healthy
├─ Read Replicas: ✅ 3/3 healthy, <100ms lag
├─ Redis Cache: ✅ Healthy (78% memory)
└─ Elasticsearch: ⚠️ Warning (disk 82%)

EXTERNAL SERVICES
├─ Stripe API: ✅ Healthy
├─ SendGrid: ✅ Healthy
├─ Twilio: ✅ Healthy
└─ S3: ✅ Healthy

ALERTS
├─ Active: 2 (1 warning, 1 info)
├─ Silenced: 0
└─ Recent (24h): 7 resolved

RECOMMENDATIONS:
1. ⚠️ Investigate high CPU on api-prod-07, api-prod-09
2. ⚠️ Plan Elasticsearch disk cleanup (projected full in 5 days)
3. ℹ️ Consider scaling API tier before traffic peak

Want me to investigate any of these items?
```

### Change Management

**Change Request Assistance:**
```
User: I need to deploy v2.4.0 to production tonight

IT Ops: I'll help prepare the change request.

📝 CHANGE REQUEST DRAFT
━━━━━━━━━━━━━━━━━━━━━━

Title: Deploy payment-service v2.4.0 to production
Type: Standard Change
Risk: Medium
Environment: Production

CHANGE WINDOW
Requested: Tonight (2026-01-29 22:00-23:00 UTC)
Duration: 60 minutes (including validation)
Maintenance Window: ✅ Within approved window

PRE-DEPLOYMENT CHECKLIST
☐ Staging deployment successful
☐ QA sign-off received
☐ Rollback plan documented
☐ Monitoring dashboards ready
☐ On-call team notified

DEPLOYMENT STEPS
1. Enable maintenance mode (if needed)
2. Deploy to canary (10% traffic)
3. Monitor for 10 minutes
4. Full rollout if healthy
5. Disable maintenance mode

ROLLBACK PLAN
• Trigger: Error rate >1% or latency >500ms
• Action: kubectl rollout undo deployment/payment-service
• ETA: <2 minutes

Shall I:
1. Create this as a ServiceNow change request?
2. Notify the on-call team?
3. Prepare the deployment commands?
```

### Documentation

**Auto-Generated Postmortem:**
```
User: Generate a postmortem for the checkout outage yesterday

IT Ops: I'll compile the postmortem from incident data.

📄 INCIDENT POSTMORTEM
━━━━━━━━━━━━━━━━━━━━━━

Incident: INC0098765 - Checkout Service Outage
Date: 2026-01-28
Duration: 47 minutes (14:23 - 15:10 UTC)
Severity: SEV-1
Author: IT Operations (AI-assisted)
Status: Draft (requires human review)

EXECUTIVE SUMMARY
The checkout service experienced a complete outage affecting all
customers attempting to complete purchases. Root cause was
database connection pool exhaustion following a traffic spike
from a marketing campaign launch.

IMPACT
• Duration: 47 minutes
• Users affected: ~12,400 (attempted checkouts)
• Revenue impact: Estimated $180,000 (based on historical conversion)
• Customer complaints: 234 support tickets

TIMELINE
14:15 - Marketing campaign launched (20% traffic increase)
14:20 - Connection pool utilization reaches 90%
14:23 - First customer reports of checkout failures
14:25 - Monitoring alert fires (SEV-1 auto-created)
14:27 - On-call engineer engaged
14:35 - Root cause identified (connection pool exhaustion)
14:42 - Emergency pool expansion approved
14:48 - Configuration deployed
15:05 - Service fully recovered
15:10 - Incident closed

ROOT CAUSE
[Technical details...]

ACTION ITEMS
| # | Action | Owner | Due |
|---|--------|-------|-----|
| 1 | Increase default pool size | Platform | 2026-02-01 |
| 2 | Add pool utilization alert at 70% | IT Ops | 2026-01-30 |
| 3 | Require traffic estimates for campaigns | Marketing | 2026-02-05 |

This is a draft. Please review and edit before publishing.
```

## Integration Points

This skill integrates with:
- **ServiceNow** — Incident and change management
- **PagerDuty** — Alert management and escalation
- **Datadog/Prometheus** — Metrics and monitoring
- **AWS/Azure/GCP** — Cloud resource management
- **Jira** — Issue tracking and sprint management
- **Slack/Teams** — Communication and notifications

## Knowledge Requirements

For optimal performance, ingest these document types:
- System architecture diagrams
- Runbooks and procedures
- Service dependency maps
- SLA definitions
- Escalation policies
- Past incident postmortems

## Limitations

This skill:
- Requires human approval for production changes
- Cannot access systems without configured integrations
- Relies on knowledge base for organization-specific procedures
- Should not be used as sole decision-maker for critical incidents

## Related Skills

- `cloud-architect` — For infrastructure design decisions
- `security-analyst` — For security-related incidents
- `enterprise-common` — Shared enterprise patterns
