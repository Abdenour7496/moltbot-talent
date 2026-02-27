# Security Auditor — Procedures

Standard operating procedures for security auditing tasks.

## Security Audit Pipeline

### Overview

Inspired by multi-agent workflow patterns, the security audit follows a deterministic pipeline where each phase verifies the previous one's work.

```
scan → prioritize → setup → fix → verify → test → report
```

### Why This Works
- **Deterministic steps** — Same pipeline, same order. No skipped phases.
- **Verification at every stage** — Each fix is individually verified before proceeding.
- **Fresh context per fix** — Each vulnerability gets focused attention, preventing context fatigue.
- **Retry and escalate** — Failed fixes retry automatically. Exhausted retries escalate to humans.

---

## Phase 1: Comprehensive Scan

### Scan Procedure

**1. Understand the stack:**
```bash
# Identify framework, language, dependencies
cat package.json         # Node.js projects
cat requirements.txt     # Python projects
cat go.mod              # Go projects
cat Cargo.toml          # Rust projects
```

**2. Run automated scans:**
```bash
# Dependency vulnerabilities
npm audit                     # Node.js
pip-audit                     # Python
cargo audit                   # Rust

# Secret scanning
grep -rn "api[_-]?key\|secret\|password\|token" --include="*.{js,ts,py,go,java}" .
grep -rn "-----BEGIN.*KEY-----" .
```

**3. Manual code review — check for:**
- SQL injection (raw queries, string concatenation in queries)
- XSS (unescaped user input in templates/responses)
- CSRF (missing CSRF tokens on state-changing endpoints)
- Auth bypass (missing auth middleware, broken access control)
- Directory traversal (user input in file paths)
- SSRF (user-controlled URLs in server-side requests)
- Insecure deserialization
- Missing input validation on API endpoints
- Hardcoded credentials or secrets
- Insecure file permissions

**4. Check auth/session handling:**
- Token expiry configuration
- Session fixation prevention
- Cookie flags (Secure, HttpOnly, SameSite)

**5. Check security headers:**
- CORS configuration
- Content-Security-Policy
- HSTS (Strict-Transport-Security)
- X-Frame-Options / X-Content-Type-Options

**6. Document every finding with:**
- Severity (critical/high/medium/low)
- File and line number
- Description of the vulnerability
- CWE identifier (when applicable)
- Proof of exploitability

---

## Phase 2: Prioritize & Group

### Prioritization Procedure

**1. Deduplicate findings:**
- Same root cause = one fix (e.g., multiple XSS from same missing sanitizer)
- Group related issues

**2. Rank by severity:**
```
exploitability × impact = priority

Critical: Remotely exploitable + data breach risk
High:     Exploitable with some access + significant impact
Medium:   Requires specific conditions + moderate impact
Low:      Difficult to exploit + minimal impact
```

**3. Create fix plan:**
- Maximum 20 fixes per audit pass
- Order by severity (critical first)
- Note deferred items with justification

**4. Output format for each fix:**
```
FIX-001: [Severity] Brief title
  Vulnerability: Description
  Files: affected-file.ts:L42, other-file.ts:L88
  Remediation: What needs to change
  Acceptance Criteria:
    - Vulnerability is no longer exploitable
    - Regression test passes
    - Build/typecheck passes
```

---

## Phase 3: Fix Implementation

### Fix Procedure (Per Vulnerability)

**1. Implement the fix:**
- Minimal, targeted changes only
- Address the root cause, not symptoms
- Follow the project's existing patterns

**2. Write regression tests:**
```
Every fix MUST include a regression test that:
- Reproduces the original vulnerability scenario
- Verifies the fix blocks exploitation
- Would FAIL if the fix were reverted
```

**3. Verify build passes:**
```bash
# Run build
npm run build  # or equivalent

# Run all tests
npm test  # or equivalent
```

**4. Commit with clear message:**
```
fix(security): brief description of what was fixed

- CWE-XXX: Description
- Adds regression test for [vulnerability]
```

---

## Phase 4: Verification

### Verification Procedure

**Critical: Verifier does NOT implement fixes — only checks them**

**1. Run the full test suite:**
```bash
# All tests must pass
npm test
```

**2. Review the fix:**
- Does it actually address the vulnerability?
- Does it handle edge cases?

**3. Bypass testing — think like an attacker:**

| Vulnerability | Bypass Checks |
|---------------|---------------|
| SQL Injection | All query patterns, not just the one found? Parameterized everywhere? |
| XSS | All output contexts (HTML, attributes, JS, URLs)? |
| Path Traversal | URL-encoded sequences (%2e%2e)? Null bytes? Double encoding? |
| Auth Bypass | All HTTP methods (GET, POST, PUT, DELETE)? |
| CSRF | Token validated server-side? Not just client-side? |

**4. Check regression test quality:**
- Does it test the right thing?
- Would it fail without the fix?
- Is it specific to this vulnerability?

**5. Decision:**
- **PASS** — Fix addresses the vulnerability, tests pass, no bypasses found
- **RETRY** — Specific issues documented with actionable feedback

---

## Phase 5: Final Testing

### Integration Test Procedure

**1. Full test suite:**
```bash
# All tests must pass
npm test
```

**2. Re-run security scan:**
```bash
# Compare before/after
npm audit
```

**3. Smoke test:**
- Does the application still start?
- Are core features working?
- No regressions from security fixes?

**4. Summary report:**
```
Vulnerabilities Found: X
Vulnerabilities Fixed: Y
Vulnerabilities Deferred: Z (with justification)
Before: npm audit shows N issues
After: npm audit shows M issues
```

---

## Retry & Escalation Policy

### Automatic Retry
- Each fix gets **2 retry attempts** if verification fails
- Retry includes feedback from verifier about what's wrong
- Fresh context on each retry — clean assessment

### Escalation
- If retries exhausted → escalate to human security team
- Critical findings that can't be auto-fixed → immediate escalation
- Policy decisions (acceptable risk) → always escalate to management
- Never silently skip a failed fix

### Escalation Template
```
⚠️ SECURITY ESCALATION
━━━━━━━━━━━━━━━━━━━━━━

Finding: [Brief description]
Severity: [Critical/High/Medium/Low]
Attempts: [How many fix attempts were made]
Last Issue: [Why the last attempt failed]

Requires Human Decision:
• [What decision is needed]
• [Options available]

Recommended Action:
• [Your recommendation with rationale]
```

---

## Reporting Standards

### Security Audit Report Format

```
📋 SECURITY AUDIT REPORT
━━━━━━━━━━━━━━━━━━━━━━━

Scan Date: [Date]
Scope: [What was scanned]
Scanner: Security Auditor (AI Virtual Talent)
Status: [Draft — requires human review]

EXECUTIVE SUMMARY
Vulnerabilities Found: X (Y critical, Z high)
Vulnerabilities Fixed: N
Remaining: M (with severity breakdown)

FINDINGS BY SEVERITY
[Detailed listing per finding]

REMEDIATION TIMELINE
Critical: Immediate
High: Within 24 hours
Medium: Within 1 week
Low: Next release cycle

RECOMMENDATIONS
[Architectural or process improvements]
```
