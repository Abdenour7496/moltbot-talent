# IT Operations Specialist — Procedures

Standard operating procedures for common IT operations tasks.

## Incident Response Framework

### 1. Incident Detection & Triage (First 5 minutes)

```
┌─────────────────────────────────────────────────────────┐
│                  INCIDENT DETECTED                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Assess & Classify    │
         │   - Impact scope       │
         │   - Affected services  │
         │   - User impact        │
         └──────────┬─────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    ┌───────┐   ┌───────┐   ┌───────┐
    │ SEV-1 │   │ SEV-2 │   │ SEV-3 │
    │ Page  │   │ Alert │   │ Queue │
    └───────┘   └───────┘   └───────┘
```

**Initial Assessment Questions:**
1. What is broken? (specific service/feature)
2. Who is affected? (all users, subset, internal only)
3. What changed recently? (deployments, config, external)
4. Is there a known workaround?

### 2. Communication Template

```
🚨 INCIDENT: [Brief Description]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: INVESTIGATING | IDENTIFIED | MITIGATING | RESOLVED
Severity: SEV-1 | SEV-2 | SEV-3
Impact: [Who/what is affected]

Current Status:
[What we know right now]

Actions Taken:
• [Action 1]
• [Action 2]

Next Steps:
• [What we're doing next]

ETA: [If known, otherwise "Investigating"]

Last Updated: [Timestamp]
Next Update: [Time]
```

### 3. Escalation Matrix

| Condition | Escalate To | Method |
|-----------|-------------|--------|
| SEV-1 not resolved in 15 min | Engineering Lead | Page |
| Security suspected | Security Team | Page + Slack |
| Database corruption | DBA On-Call | Page |
| Customer data at risk | VP Engineering + Legal | Phone |
| External dependency | Vendor Support | Ticket + Phone |

---

## Common Runbook Procedures

### Service Restart Procedure

**Pre-checks:**
- [ ] Verify the service is actually unhealthy (not just a monitoring false positive)
- [ ] Check for recent deployments or config changes
- [ ] Confirm no dependent services will be impacted
- [ ] Notify stakeholders if user-facing

**Execution:**
```bash
# Check service status
systemctl status <service-name>

# View recent logs
journalctl -u <service-name> -n 100 --no-pager

# Graceful restart (preferred)
systemctl restart <service-name>

# Verify recovery
systemctl status <service-name>
curl -s localhost:<port>/health
```

**Post-checks:**
- [ ] Service shows healthy in monitoring
- [ ] No error spike in logs
- [ ] Dependent services functioning
- [ ] Update incident ticket

---

### Log Analysis Procedure

**1. Identify timeframe:**
```bash
# Find when errors started
grep -i "error\|exception\|fatal" /var/log/app/app.log | head -20
```

**2. Correlate with events:**
```bash
# Check deployment times
ls -la /var/deployments/

# Check config changes
git log --oneline -10 /etc/app/config.yml
```

**3. Extract patterns:**
```bash
# Count error types
grep -i "error" /var/log/app/app.log | \
  sed 's/\[.*\]//g' | \
  sort | uniq -c | sort -rn | head -20
```

**4. Check correlated services:**
```bash
# Database connectivity
psql -h $DB_HOST -c "SELECT 1" 2>&1

# External API health
curl -s -o /dev/null -w "%{http_code}" https://api.external.com/health
```

---

### Disk Space Emergency Procedure

**Immediate Actions:**
```bash
# Find largest directories
du -h --max-depth=2 / 2>/dev/null | sort -hr | head -20

# Find large files modified recently
find / -type f -size +100M -mtime -7 2>/dev/null

# Check for runaway logs
ls -lhS /var/log/*.log | head -10
```

**Safe Cleanup (requires approval for production):**
```bash
# Truncate logs (keeps file handles)
> /var/log/app/debug.log

# Clean package cache
apt-get clean  # Debian/Ubuntu
yum clean all  # RHEL/CentOS

# Clean old Docker resources
docker system prune -a --volumes
```

**⚠️ NEVER delete without understanding what it is**

---

### Database Connection Issues

**Diagnosis:**
```bash
# Check connectivity
pg_isready -h $DB_HOST -p 5432

# Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check for locks
psql -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Check replication lag (if replica)
psql -c "SELECT pg_last_xlog_replay_location();"
```

**Common Fixes:**
1. **Connection pool exhausted** → Restart application to release connections
2. **Max connections reached** → Kill idle connections or increase limit
3. **Replication lag** → Check network, consider failover if severe
4. **Disk full on DB server** → Emergency disk cleanup (escalate to DBA)

---

## Change Management

### Pre-Change Checklist

- [ ] Change request approved in ticket system
- [ ] Rollback plan documented
- [ ] Monitoring alerts silenced for expected impact
- [ ] Stakeholders notified
- [ ] Backup verified (if applicable)
- [ ] Maintenance window confirmed

### Post-Change Verification

- [ ] Service health checks passing
- [ ] No unexpected errors in logs
- [ ] Metrics within normal range
- [ ] Rollback plan archived
- [ ] Change ticket closed
- [ ] Documentation updated

---

## Handoff Procedures

### Shift Handoff Template

```
📋 SHIFT HANDOFF
━━━━━━━━━━━━━━━

Outgoing: [Name]
Incoming: [Name]
Time: [Timestamp]

ACTIVE ISSUES:
• [Issue 1] - Status, next steps
• [Issue 2] - Status, next steps

SCHEDULED CHANGES:
• [Change 1] - Time, owner
• [Change 2] - Time, owner

THINGS TO WATCH:
• [Metric/service to monitor]

COMPLETED THIS SHIFT:
• [Action 1]
• [Action 2]

NOTES:
[Any additional context]
```

---

## Documentation Standards

### Runbook Format

Every runbook must include:
1. **Purpose** — What problem does this solve?
2. **Prerequisites** — Access, tools, knowledge required
3. **Procedure** — Step-by-step instructions
4. **Verification** — How to confirm success
5. **Rollback** — How to undo if something goes wrong
6. **Troubleshooting** — Common issues and fixes
7. **Owner** — Who maintains this document

### Incident Postmortem Format

1. **Summary** — One paragraph overview
2. **Timeline** — Detailed chronology
3. **Impact** — Users affected, duration, revenue impact
4. **Root Cause** — Technical explanation
5. **Resolution** — What fixed it
6. **Action Items** — Preventive measures (with owners and dates)
7. **Lessons Learned** — What we'd do differently
