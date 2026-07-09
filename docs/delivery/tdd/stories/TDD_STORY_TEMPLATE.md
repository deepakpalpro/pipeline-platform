# Story TDD Guide Template (junior developers)

**Audience:** Developers implementing a user story (especially juniors)  
**Purpose:** Step-by-step **Red → Green → Refactor** playbook so you know *exactly* what to write first, how to prove it, and when the story is Done.

Not the same as:

| Doc | Audience | Purpose |
|-----|----------|---------|
| [`../WAVE_N_TDD.md`](../README.md) | Tech stakeholders | Wave-level strategy & exit gates |
| [`../../kb/`](../../kb/) | Support / ops | How to verify & troubleshoot in prod-like envs |
| [`../../waves/WAVE_N.md`](../../waves/) | Delivery | Full AC / backlog |

Copy to `docs/delivery/tdd/stories/W#-US##-tdd.md` when pulling a story.

---

## Metadata

| Field | Value |
|-------|--------|
| **Story** | `W#-US##` — Title |
| **Depends on** | Prior story / infra |
| **Branch** | `W#-US##` from `wave-N` |
| **Timebox hint** | e.g. 0.5–1 day |
| **You will touch** | List of dirs/files |

---

## 0. Before you code (5 minutes)

1. Read the story AC in [`../../waves/WAVE_N.md`](../../waves/).
2. Create branch: `git checkout wave-N && git pull && git checkout -b W#-US##`
3. Confirm prerequisites (Compose up? prior story merged?).
4. Write down the **one sentence** definition of Done for *this* story.

**Done means:** …

---

## 1. RED — write the failing test first

### What to create

| File | Method | Asserts |
|------|--------|---------|
| | | |

### Commands

```bash
# run only this test — expect FAILURE
```

### What “red” looks like

Paste / describe the expected failure (compile error, assertion fail, connection refused).

**Stop.** Do not write production code until you have seen red.

---

## 2. GREEN — smallest code that passes

### Files to add/change (minimal)

1. …
2. …

### Commands

```bash
# expect SUCCESS
```

### Checklist

- [ ] Test green
- [ ] No unrelated refactors yet
- [ ] No secrets committed

---

## 3. REFACTOR — clean without breaking tests

- …
- Re-run tests after each cleanup.

```bash
# still green
```

---

## 4. Manual verify (if story requires)

| # | Action | Expected |
|---|--------|----------|
| 1 | | |

---

## 5. Docs & trackers (same PR)

- [ ] KB article (or update) under `docs/delivery/kb/`
- [ ] `WAVE_TRACKER.md` → Done + test gate
- [ ] `TEST_MATRIX.md` cells marked
- [ ] Story status in `waves/WAVE_N.md`

---

## 6. Ship lifecycle

```text
push branch → merge into wave-N → tag W#-US## → delete branch → next story branch
```

See [`../../../DELIVERY_PLAN.md`](../../../DELIVERY_PLAN.md) Working agreements.

---

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| | |

---

## Help / escalate

- Stuck > 30 min on env: check story KB + Compose health
- Architecture question: [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
- Pair with buddy / ask in PR draft early
