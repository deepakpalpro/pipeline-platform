# W2-US06 TDD Guide — Retries + per-stage DLQ

| Field | Value |
|-------|--------|
| **Story** | W2-US06 — Retry + stage DLQ path for poison messages |
| **Depends on** | W2-US03 |
| **Branch** | `W2-US06` from `wave-2` |
| **Timebox hint** | 1–1.5 days |
| **You will touch** | DLQ binds, retry policy, failure IT |
| **Stakeholder TDD** | [`../WAVE_2_TDD.md`](../WAVE_2_TDD.md) |
| **AC source** | [`../../waves/WAVE_2.md`](../../waves/WAVE_2.md) § W2-US06 |
| **Architecture** | §8 retries / DLQ |
| **KB (create)** | `docs/delivery/kb/W2-US06-stage-dlq.md` |

---

## What you are building

When a stage message fails repeatedly, it lands on a **per-stage DLQ**. Retry uses pipeline `retry_config` (max retries, backoff).

**Done means:** `StageDlqIT.poison_landsOnDlq` green.

**Out of scope:** Alerting UI; full observability dashboards.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `RetryPolicyTest` | `exhaustsThenDlq` | attempts == max |
| `StageDlqIT` | `poison_landsOnDlq` | message on DLQ |

---

## 2. GREEN

1. Declare DLQ + dead-letter args on stage queues.
2. Consumer nacks / throws until retries exhausted.
3. Assert DLQ receive in IT.

### Checklist

- [ ] Error headers preserved where useful
- [ ] Tenant still in queue names
- [ ] Feeds support KB “pipeline run failed”

---

## 6. Ship

```text
merge → tag W2-US06
```
