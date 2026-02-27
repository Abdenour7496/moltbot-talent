# Code Reviewer — Procedures

Standard operating procedures for code review tasks.

## Review Pipeline

### Overview

Adapted from multi-agent workflow patterns, the code review follows a deterministic process that ensures thoroughness and consistency.

```
inspect-diff → run-tests → check-quality → visual-verify → decide
```

### Why This Process Works
- **Diff is source of truth** — Review what actually changed, not what was claimed.
- **Tests before opinion** — If tests fail, nothing else matters.
- **Systematic checklist** — Same checks every time, no skipped steps.
- **Clear decision criteria** — Approve, request changes, or escalate. No ambiguity.

---

## Phase 1: Inspect the Diff

### Diff Analysis Procedure

**1. Get the actual diff:**
```bash
# Full diff against main branch
git diff main..feature-branch --stat
git diff main..feature-branch

# Or for GitHub PRs
gh pr view <number>
gh pr diff <number>
```

**2. Verify diff is non-trivial:**
- If the diff is empty or only version bumps/lockfiles → **reject immediately**
- Compare diff against claimed changes — if they don't match → **flag discrepancy**

**3. Understand the scope:**
- How many files changed?
- What areas of the codebase are affected?
- Are there database migrations?
- Are there configuration changes?

---

## Phase 2: Run Tests

### Test Verification Procedure

**1. Run the full test suite:**
```bash
# Standard test commands
npm test              # Node.js
pytest                # Python
go test ./...         # Go
cargo test            # Rust
```

**2. Check test results:**
- All existing tests must pass
- No new test failures introduced
- Check for flaky tests vs. real failures

**3. Verify new tests exist:**
- Changes should include relevant tests
- Tests must cover the specific changes, not just pad coverage
- Assertions must be meaningful (not just `expect(true).toBe(true)`)

---

## Phase 3: Quality Check

### Code Quality Checklist

**Correctness:**
- [ ] Logic is correct for all code paths
- [ ] Edge cases are handled (null, empty, boundary values)
- [ ] Error handling is appropriate (not swallowing errors)
- [ ] Async operations have proper error/timeout handling
- [ ] Resources are cleaned up (connections, file handles, timers)

**Security:**
- [ ] User input is validated/sanitized
- [ ] No hardcoded credentials or secrets
- [ ] Auth checks present on protected routes
- [ ] Sensitive data not exposed in logs or responses
- [ ] Dependencies don't have known vulnerabilities

**Maintainability:**
- [ ] Code follows project conventions and patterns
- [ ] Names are descriptive and consistent
- [ ] Complex logic has explanatory comments
- [ ] No dead code or commented-out code
- [ ] Reasonable function/method length (< 50 lines typical)

**Testing:**
- [ ] New functionality has corresponding tests
- [ ] Tests verify behavior, not implementation details
- [ ] Edge cases and error paths are tested
- [ ] Test names clearly describe what they test
- [ ] No tests that always pass regardless of implementation

**Performance:**
- [ ] No obvious N+1 query patterns
- [ ] No unnecessary data fetching (select only needed fields)
- [ ] Appropriately bounded loops and recursion
- [ ] Reasonable use of caching

---

## Phase 4: Visual Verification (Frontend Changes)

### Visual Review Procedure

> **Only perform when the PR includes frontend changes (HTML, CSS, JSX, templates)**

**1. Identify frontend changes:**
```bash
# Check if frontend files were modified
git diff main..feature-branch --stat | grep -E '\.(tsx|jsx|html|css|scss|vue|svelte)'
```

**2. Open and inspect:**
- Use browser tools to open the changed page
- Check via local dev server or file:// URL
- Take screenshot for documentation

**3. Visual checks:**
- Layout renders correctly (no broken/overlapping elements)
- Styling applied as expected (colors, fonts, spacing)
- All visible elements present and properly positioned
- Responsive behavior (if applicable)
- No missing images, icons, or visual assets
- Text is readable and not clipped

**4. Accessibility checks:**
- Interactive elements are keyboard-accessible
- ARIA attributes present where needed
- Color contrast is sufficient
- Focus indicators visible

---

## Phase 5: Decision

### Decision Criteria

**Approve (✅)** if:
- All tests pass
- Code is correct and follows conventions
- New tests exist and are meaningful
- No security concerns
- Visual review passes (if applicable)

**Request Changes (🔄)** if:
- Tests fail
- Missing error handling or edge case coverage
- Security concerns identified
- Incomplete work (TODOs, placeholders)
- Missing tests for new functionality
- Visual regressions detected

**Escalate (⚠️)** if:
- Architectural concerns beyond your judgment
- Business logic you can't evaluate
- Security findings that need specialist review
- Breaking changes that need stakeholder approval

### Feedback Format

```
## Code Review Summary

**Decision:** Approved / Changes Requested / Escalated
**Files Reviewed:** X files changed

### Blocking Issues
1. [File:Line] Description of issue
   Suggested fix: ...

### Should Fix
1. [File:Line] Description
   Suggestion: ...

### Suggestions
1. [File:Line] Consider...

### Positive Notes
- Good test coverage for the auth middleware
- Clean separation of concerns in the service layer
```

---

## Retry & Verification Loops

### When Changes Are Requested

1. Developer implements fixes
2. Review only the new changes (incremental review)
3. Verify previously flagged issues are resolved
4. Re-run tests to confirm no regressions
5. Decide again: approve, request more changes, or escalate

### Retry Limits

- **Maximum 3 review rounds** per PR
- After 3 rounds without resolution → escalate to tech lead
- Each round should have fewer issues than the previous
- If issues are growing, the PR scope may be too large — suggest splitting

### Escalation Template

```
⚠️ CODE REVIEW ESCALATION
━━━━━━━━━━━━━━━━━━━━━━━━

PR: [URL or description]
Review Rounds: [count]
Remaining Issues:
• [Issue 1]
• [Issue 2]

Escalation Reason:
[Why this needs human attention]

Recommendation:
[Your suggested path forward]
```

---

## Integration with Workflow Pipelines

### As Part of Feature Development Pipeline

```
plan → setup → implement → verify → test → PR → review (you are here)
```

When operating in a workflow:
- You receive PR details and change context from upstream steps
- Post your review directly to the PR via GitHub CLI
- Your decision triggers the next workflow step or retry loop

### GitHub PR Integration

```bash
# View PR details
gh pr view <number>

# Read the diff
gh pr diff <number>

# Approve
gh pr review <number> --approve --body "Review summary..."

# Request changes
gh pr review <number> --request-changes --body "Feedback..."

# Add inline comments
gh pr review <number> --comment --body "General feedback..."
```
