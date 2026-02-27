# Bug Triager — Procedures

Standard operating procedures for bug triage and investigation tasks.

## Bug Fix Pipeline

### Overview

Adapted from multi-agent workflow patterns, the bug fix process follows a deterministic pipeline where each phase has clear inputs, outputs, and decision criteria.

```
triage → investigate → setup → fix → verify → report
```

### Why This Pipeline Works
- **Deterministic steps** — Same process for every bug. No skipped phases.
- **Separation of concerns** — Triager doesn't fix. Fixer doesn't verify. Each role has focus.
- **Fresh context per step** — Each agent gets clean context. No hallucinated state from 50 messages ago.
- **Retry and escalate** — Failed fixes retry with feedback. Exhausted retries escalate to humans.

---

## Phase 1: Triage

### Triage Procedure (First 10 minutes)

**1. Read the bug report carefully:**
- What is the expected behavior?
- What is the actual behavior?
- What environment/version is affected?
- Is there a stack trace or error message?

**2. Assess severity:**
```
┌─────────────────────────────────────────────────────────┐
│                    BUG REPORTED                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Immediate Questions:  │
         │  - Who is affected?    │
         │  - Data at risk?       │
         │  - Revenue impact?     │
         │  - Workaround exists?  │
         └──────────┬─────────────┘
                    │
        ┌───────────┼───────────┐───────────┐
        ▼           ▼           ▼           ▼
    ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
    │ SEV-1 │   │ SEV-2 │   │ SEV-3 │   │ SEV-4 │
    │ Page  │   │ Alert │   │ Queue │   │ Track │
    └───────┘   └───────┘   └───────┘   └───────┘
```

**3. Attempt reproduction:**
```bash
# Step 1: Explore the codebase to find the affected area
find . -name "*.ts" -path "*/payment/*"  # or relevant module

# Step 2: Check recent changes near the affected area
git log --oneline -20 -- src/affected-area/

# Step 3: Look for related test failures
npm test -- --grep "payment"  # or relevant test filter

# Step 4: Check error logs if available
grep -rn "ErrorType\|error message" /var/log/app/ | tail -20
```

**4. Document findings:**
```
🔍 TRIAGE REPORT
━━━━━━━━━━━━━━━

Bug: [Brief description]
Severity: SEV-[1-4]
Reproduced: Yes / No / Partial
Affected Area: [files/modules]

Reproduction Steps:
1. [Exact step]
2. [Exact step]
3. [Observe: actual behavior]

Expected: [What should happen]
Actual: [What happens]

Environment:
- OS: [version]
- Runtime: [version]
- Related services: [versions]
```

---

## Phase 2: Investigate Root Cause

### Investigation Procedure

**1. Read the code in the affected area:**
```bash
# Identify the entry point (API endpoint, event handler, etc.)
grep -rn "router\|app\.\(get\|post\|put\|delete\)" src/ | grep "affected-endpoint"

# Read the implementation
cat src/affected-module/handler.ts
```

**2. Trace the execution flow:**
- Follow the code path from the entry point to the error
- Identify where expected behavior diverges from actual behavior
- Check data transformations, validations, and error handling at each step

**3. Check for the introducing commit:**
```bash
# Find when the affected file was last changed
git log --oneline -10 -- src/affected-file.ts

# Blame the specific lines involved
git blame src/affected-file.ts -L 40,60

# Check if a recent change introduced the issue
git bisect start
git bisect bad HEAD
git bisect good v2.3.0  # last known good version
```

**4. Document root cause:**
```
🔬 INVESTIGATION REPORT
━━━━━━━━━━━━━━━━━━━━━━

Root Cause:
[Detailed technical explanation of what's wrong and why]

Introducing Change:
[Commit hash and description, if identified]

Affected Code:
File: src/module/handler.ts
Lines: 42-58
Issue: [What specifically is wrong in this code]

Fix Approach:
[What needs to change and where — NOT the implementation itself]

Acceptance Criteria:
- [ ] Bug no longer reproducible with original steps
- [ ] Regression test added that covers this scenario
- [ ] Tests pass
- [ ] No unintended side effects in related functionality
```

---

## Phase 3: Handoff to Developer

### Handoff Format

```
🔄 BUG FIX HANDOFF
━━━━━━━━━━━━━━━━━━

Bug: [Brief description]
Severity: SEV-[1-4]

Root Cause:
[Technical description]

File(s) to Change:
- src/module/handler.ts:L42 — [what to change]
- src/module/validator.ts:L18 — [what to change]

Fix Approach:
[Detailed guidance on how to fix]

Regression Test Specification:
- Test that [scenario from bug report] no longer fails
- Test that [edge case variant] is also handled
- Assertion: [expected outcome after fix]

Acceptance Criteria:
- [ ] Original bug scenario resolved
- [ ] Regression test passes
- [ ] All existing tests pass
- [ ] Build/typecheck passes
- [ ] Fix is minimal and targeted (not a refactor)

Branch Name: bugfix/[brief-description]
```

---

## Phase 4: Fix Verification

### Verification Procedure

**When a fix comes back from the developer:**

**1. Check the actual diff:**
```bash
git diff main..bugfix-branch --stat
git diff main..bugfix-branch
```

**2. Verify fix addresses root cause:**
- Does the change match the fix approach?
- Does it fix the root cause, not just the symptom?
- Are there unintended side effects?

**3. Verify regression test:**
- Does the test cover the original bug scenario?
- Would the test fail if the fix were reverted?
- Is the test specific to this bug (not a generic placeholder)?

**4. Run the full test suite:**
```bash
npm test  # or equivalent
```

**5. Re-attempt reproduction:**
- Follow original reproduction steps
- Confirm bug no longer occurs
- Try variation scenarios (edge cases)

**6. Decision:**

**PASS:**
```
STATUS: verified
VERIFIED: 
- Bug no longer reproducible
- Regression test covers the scenario
- Fix addresses root cause (not symptom)
- All tests pass
- No side effects detected
```

**RETRY:**
```
STATUS: retry
ISSUES:
- [Specific issue with the fix]
- [What still needs to change]

VERIFY_FEEDBACK:
[Detailed feedback for the developer]
```

---

## Retry & Escalation Policy

### Automatic Retry
- Each fix gets **3 retry attempts** if verification fails
- Each retry includes detailed feedback about what's still wrong
- Fresh context on each attempt — clean verification

### Escalation Triggers
- 3 failed fix attempts → escalate to tech lead
- SEV-1 not reproduced within 15 minutes → escalate immediately
- Root cause spans multiple services → escalate to architect
- Security implications discovered → escalate to Security Auditor

### Escalation Template
```
⚠️ BUG ESCALATION
━━━━━━━━━━━━━━━━━

Bug: [Description]
Severity: SEV-[1-4]
Fix Attempts: [count]
Last Issue: [Why the last fix failed]

Investigation Summary:
[What we know]

Requires Human Decision:
• [What decision is needed]

Recommended Action:
• [Your recommendation]
```

---

## Documentation Standards

### Bug Report Enhancement

When a bug report is incomplete, enhance it with:
1. **Exact reproduction steps** (numbered, specific)
2. **Environment details** (OS, runtime, versions)
3. **Expected vs. actual behavior** (side by side)
4. **Related logs/stack traces** (sanitized of secrets)
5. **Screenshot/recording** (if visual issue)

### Post-Fix Documentation

After a bug is verified fixed:
1. **Root cause summary** — One paragraph for future reference
2. **What changed** — Files and nature of the fix
3. **Test added** — What regression test was added
4. **Preventive measure** — What would prevent similar bugs (if applicable)
