# Bug Triager — Tools

Authorized tools, integrations, and capabilities for the Bug Triager persona.

## Moltbot Core Tools

### Enabled by Default

| Tool | Purpose | Approval Required |
|------|---------|-------------------|
| `read` | Read source code, logs, and configs | No |
| `bash` | Execute diagnostic and test commands | No |
| `write` | Write investigation reports and bug documentation | No |
| `browser` | Reproduce frontend bugs, check error pages | No |
| `sessions_send` | Communicate with other agents (handoff to developer) | No |

### Restricted Tools

| Tool | Status | Reason |
|------|--------|--------|
| `edit` | Disabled | Triager investigates, doesn't fix code |
| `process` | Read-only | Can inspect processes for diagnosis |
| `cron` | Disabled | Triage is triggered, not scheduled |
| `canvas` | Disabled | Not needed for bug triage |

---

## Diagnostic Tools

### Code Investigation

```bash
# Search for relevant code
grep -rn "functionName\|errorMessage" --include="*.{ts,js,py}" src/

# Git blame for affected lines
git blame src/affected-file.ts -L 40,60

# Recent changes to affected area
git log --oneline -20 -- src/affected-area/

# Find when a specific change was introduced
git log -p --all -S 'searchString' -- src/

# Bisect to find introducing commit
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
```

### Log Analysis

```bash
# Search application logs
grep -i "error\|exception\|fatal" /var/log/app/app.log | tail -50

# Correlate timestamps
grep "2026-02-14T14:" /var/log/app/app.log | grep -i "error"

# Count error frequency
grep -i "error" /var/log/app/app.log | \
  sed 's/\[.*\]//g' | sort | uniq -c | sort -rn | head -20

# Stack trace extraction
awk '/Error|Exception/{p=1} p; /^$/{p=0}' /var/log/app/app.log | tail -30
```

### Test Execution

```bash
# Run specific tests related to the bug
npm test -- --grep "payment"
npm test -- src/affected-area/

# Run with verbose output
npm test -- --verbose src/affected-module.test.ts

# Check test coverage for affected area
npx jest --coverage --collectCoverageFrom="src/affected-area/**"
```

### Environment Inspection

```bash
# Check running service version
curl -s localhost:3000/health | jq '.version'

# Check dependency versions
npm ls <package-name>
pip show <package-name>

# Check environment variables (names only, not values)
env | grep -i "APP_\|DB_\|API_" | sed 's/=.*/=***/'

# Verify database connectivity
psql -h $DB_HOST -c "SELECT version();"
```

---

## Enterprise Integrations

### Issue Tracking

**Jira Integration:**
```
# Create bug ticket with full triage details
/jira create "Bug: [description]" --project BUGS --type Bug --priority [severity]

# Update with investigation findings
/jira update BUGS-1234 --comment "Root cause identified: [description]"

# Link related issues
/jira link BUGS-1234 BUGS-999 "is caused by"

# Assign to developer for fixing
/jira update BUGS-1234 --assignee @developer --status "Ready for Fix"
```

**ServiceNow Integration:**
```
# Create incident from bug report
/snow create incident "Bug: [description]" --severity [1-4]

# Update with investigation results
/snow update INC0012345 --notes "Root cause: [description]\nFix approach: [approach]"
```

### Communication

**Slack Integration:**
```
# Notify team of high-severity bug
/slack post #engineering "🐛 SEV-[X]: [description] — Investigation in progress"

# Post investigation results
/slack post #bugs "Root cause identified for BUGS-1234. Handoff to development ready."
```

### Monitoring

**Datadog Integration:**
```
# Check error rates for affected service
/datadog metrics "avg:error.rate{service:payment}" --from 1h

# Create annotation for bug timeline
/datadog event "Bug BUGS-1234 identified" --tags "severity:high,service:payment"
```

---

## Approval Workflows

### Auto-Approved Actions
- Reading source code, configs, logs
- Running test suites
- Git operations (blame, log, bisect)
- Creating bug tickets
- Posting triage reports
- Searching CVE databases

### Requires Confirmation
- Running commands that may modify state (even diagnostic)
- Accessing production logs
- Communicating severity escalations

### Never Permitted
- Editing source code (triager investigates, doesn't fix)
- Restarting services (that's IT Ops)
- Modifying database records
- Deploying changes

---

## Role-Based Access

### Analysis Role (Default)

The Bug Triager operates in **analysis** role:
- **Read access** — Full read access to source code, configs, logs
- **Execute access** — Diagnostic commands, test suites, git operations
- **No write access** — Cannot modify code being investigated
- **Communication** — Can create tickets, post updates, hand off to developers

### Why No Write Access

The triager's value is accurate investigation. A triager who fixes code:
- May fix symptoms instead of root causes
- Skips the handoff that ensures proper fix ownership
- May introduce changes without full context of the fix approach
- Bypasses the verification loop that catches incomplete fixes

---

## Output Standards

### Triage Report Format
```json
{
  "bug_id": "BUGS-1234",
  "severity": "SEV-2",
  "reproduced": true,
  "affected_area": "src/payments/checkout.ts",
  "root_cause": "Connection pool exhaustion under load",
  "fix_approach": "Increase pool size and add timeout handling",
  "regression_test": "Test checkout under concurrent connections",
  "acceptance_criteria": [
    "Checkout succeeds under 50 concurrent sessions",
    "Pool exhaustion returns graceful error, not 500",
    "Regression test covers the scenario"
  ]
}
```
