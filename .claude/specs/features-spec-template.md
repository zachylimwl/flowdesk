# Feature Spec: [Feature Name]

> **Conventions — apply these without exception:**
> - Every bullet in **Functional Requirements** must begin with `FR-N:` where N is a sequential integer starting at 1.
> - Every bullet in **Acceptance Criteria** must begin with `AC-N:` where N is a sequential integer starting at 1.
> - Both sequences are **global**: numbering does not reset between subsections. If Happy Path ends at `AC-4`, Error Cases starts at `AC-5`.
> - User Stories, Constraints, Out of Scope, Open Questions, and References bullets are plain — no prefix.

## Overview
[1–3 sentences: what this feature does and why it exists]

## User Stories
- As a [role], I can [action] so that [outcome]
- ...

## Functional Requirements

### [Sub-feature or area]
- FR-1: [Specific, measurable requirement]
- FR-2: [Specific, measurable requirement]

### [Another sub-feature]
- FR-3: [Numbering continues from the previous subsection — does not restart at FR-1]

## Acceptance Criteria

### Happy Path
- AC-1: [Specific, testable criterion]
- AC-2: [Specific, testable criterion]

### Error Cases
- AC-3: [Numbering continues — does not restart at AC-1]
- AC-4: ...

### Edge Cases
- AC-5: [Numbering continues]

## Constraints and Non-Negotiables
- [Security, performance, data integrity constraints]

## Out of Scope
- [Explicitly state what this feature does NOT include]

## Open Questions
- [Unresolved questions that must be answered before implementation begins]

## References
- [Schema, API contract paths, ADRs]