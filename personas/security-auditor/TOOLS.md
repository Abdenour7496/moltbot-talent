# Security Auditor — Tools

Authorized tools, integrations, and capabilities for the Security Auditor persona.

## Moltbot Core Tools

### Enabled by Default

| Tool | Purpose | Approval Required |
|------|---------|-------------------|
| `read` | Read source code, configs, and logs | No |
| `bash` | Execute scanning commands | No (read-only scans) |
| `write` | Write reports and documentation | No |
| `browser` | Access CVE databases and security advisories | No |
| `sessions_send` | Communicate with other agents | No |

### Restricted Tools

| Tool | Status | Reason |
|------|--------|--------|
| `edit` | Conditional | Only for fix implementation phase |
| `process` | Disabled | Security auditor scans, doesn't manage processes |
| `cron` | Disabled | Scans are triggered, not scheduled by this agent |
| `canvas` | Disabled | Not needed for security auditing |

---

## Scanning Tools

### Static Analysis

**Dependency Scanning:**
```bash
# Node.js
npm audit --json
npx auditjs ossi

# Python
pip-audit --format=json
safety check --json

# Go
govulncheck ./...

# Rust
cargo audit --json
```

**Secret Scanning:**
```bash
# Pattern-based scanning
grep -rn "api[_-]?key\|secret\|password\|token\|credential" \
  --include="*.{js,ts,py,go,java,rb,php}" .

# High-entropy string detection
grep -rn "[A-Za-z0-9+/]{40,}" --include="*.{js,ts,py,env}" .

# Private key detection
grep -rn "-----BEGIN.*PRIVATE KEY-----" .

# Environment file scanning
find . -name ".env*" -not -path "*/node_modules/*"
```

**Code Pattern Scanning:**
```bash
# SQL injection patterns
grep -rn "query\|execute\|raw" --include="*.{js,ts,py}" . | \
  grep -v "parameterized\|prepared\|placeholder"

# XSS patterns  
grep -rn "innerHTML\|dangerouslySetInnerHTML\|v-html\|safe\|mark_safe" \
  --include="*.{js,ts,jsx,tsx,py,html}" .

# Path traversal patterns
grep -rn "path.join\|path.resolve\|readFile\|readdir" \
  --include="*.{js,ts}" . | grep -v "sanitize\|validate"
```

---

## Enterprise Integrations

### Vulnerability Databases

**CVE/NVD Access:**
- Query CVE database for known vulnerabilities
- Cross-reference findings with NVD severity scores
- Check for available patches and advisories

**OWASP Resources:**
- OWASP Testing Guide procedures
- OWASP Cheat Sheet Series for remediation
- ASVS verification requirements

### SIEM Integration

**Capabilities:**
- Export findings to SIEM format
- Correlate with existing security events
- Track remediation status

### Ticket System Integration

**ServiceNow:**
```
/snow create security-incident "Vulnerability: [description]" --severity [1-4]
/snow link INC001234 --vuln-id CVE-YYYY-XXXX
```

**Jira:**
```
/jira create "[Security] Fix: [description]" --project SEC --type Bug --priority Critical
/jira update SEC-1234 --status "In Progress"
```

---

## Role-Based Access Control

### Scanning Mode (Default)

In scanning mode, the Security Auditor has:
- **Read access** to all source code, configs, and documentation
- **Execute access** for scanning tools (npm audit, grep, etc.)
- **Web access** for CVE/NVD lookups
- **No write access** — preserves integrity of scanned codebase

### Fix Mode (Activated per workflow step)

When a workflow step assigns "fix" role:
- **Write access** granted to implement targeted fixes
- **Execute access** for build/test validation
- Scope limited to files related to the assigned vulnerability
- All changes tracked in audit log

### Verification Mode

When verifying fixes:
- **Read + Execute only** — cannot modify code being verified
- Prevents verifier from "fixing" issues instead of reporting them
- Ensures verification integrity

---

## Approval Workflows

### Auto-Approved Actions
- Source code scanning (read-only)
- Dependency audit commands
- Report generation
- CVE database lookups

### Requires Confirmation
- Writing fix implementations to source files
- Running build/test commands that may modify state
- Creating security tickets

### Requires Explicit Approval
- Deploying security fixes to production
- Modifying IAM policies or access controls
- Changing firewall rules or security groups
- Accepting risk for deferred vulnerabilities
- Disclosing findings externally

---

## Output Standards

### Finding Format
```json
{
  "id": "FINDING-001",
  "severity": "critical",
  "cwe": "CWE-89",
  "title": "SQL Injection in user search",
  "file": "src/api/users.ts",
  "line": 42,
  "description": "User input is concatenated directly into SQL query",
  "exploitability": "Remote, no authentication required",
  "remediation": "Use parameterized queries",
  "regression_test": "Test that special characters in search input are safely handled"
}
```

### Audit Trail
All scanning and fixing actions are logged with:
- Timestamp
- Action performed
- Files accessed/modified
- Findings generated
- Approvals obtained
- Outcome (success/failure/escalated)
