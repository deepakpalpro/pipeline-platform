# W0-US03 TDD Guide — Flyway baseline schema

| Field | Value |
|-------|--------|
| **Story** | W0-US03 — Flyway baseline schema apply |
| **Depends on** | W0-US02 |
| **Branch** | `W0-US03` from `wave-0` |
| **Timebox hint** | 0.5–1 day |
| **You will touch** | Flyway deps, `V1__baseline.sql`, `FlywayBaselineIT`, `application.yml` |
| **Stakeholder TDD** | [`../WAVE_0_TDD.md`](../WAVE_0_TDD.md) |
| **AC source** | [`../../waves/WAVE_0.md`](../../waves/WAVE_0.md) § W0-US03 |
| **KB** | [`../../kb/W0-US03-flyway-baseline.md`](../../kb/W0-US03-flyway-baseline.md) |

---

## What you are building (plain English)

On app startup, Flyway runs SQL migrations. Wave 0 only needs `V1__baseline.sql` creating a **`tenants`** stub table (architecture naming). An IT proves the table and Flyway history exist.

**Done means:** Fresh or existing Compose DB shows `tenants` + `flyway_schema_history` with `V1__baseline.sql` after Boot starts / IT runs.

---

## 0. Before you code

```bash
git checkout wave-0 && git pull
git checkout -b W0-US03
docker compose up -d mysql
```

Read architecture tenants columns (id, name, slug, status, timestamps, etc.) — match names/types as closely as the stub allows.

---

## 1. RED — IT that expects `tenants`

### Create

`pipeline-api/src/test/java/.../FlywayBaselineIT.java`

- Same pattern as health IT: `@SpringBootTest`, `@ActiveProfiles("local")`, `assumeTrue` MySQL `:3306`
- Autowire `JdbcTemplate`
- Tests:
  1. `tenantsTable_exists` — `information_schema.tables` count = 1 for `tenants`
  2. `flywaySchemaHistory_hasBaseline` — history row for `V1__baseline.sql` with `success = 1`

### Run (expect FAIL)

```bash
./mvnw -pl pipeline-api test -Dtest=FlywayBaselineIT
# table missing / flyway_schema_history missing
```

**Stop.** Red.

---

## 2. GREEN — Flyway + V1 migration

### Add

1. Dependencies: `flyway-core`, `flyway-mysql`
2. `application.yml`:

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
```

3. File: `pipeline-api/src/main/resources/db/migration/V1__baseline.sql`  
   - `CREATE TABLE tenants ( ... )`  
   - Include at least: id, name, slug, status, created_at (plus architecture extras if easy: credit_balance, etc.)
   - Unique slug, primary key on id

### Run

```bash
./mvnw -pl pipeline-api test -Dtest=FlywayBaselineIT
# SUCCESS
```

Manual check:

```bash
./mvnw -pl pipeline-api spring-boot:run -Dspring-boot.run.profiles=local
# logs: Flyway migrate / schema up to date

docker compose exec -T mysql mysql -upipeline -ppipeline pipeline -e \
  "SHOW TABLES; SELECT version, script, success FROM flyway_schema_history;"
```

### Checklist

- [ ] IT green
- [ ] Do **not** edit `V1__` after it has been applied on shared DBs — next change is `V2__`
- [ ] No full pipeline/connector schema yet

---

## 3. REFACTOR

- Align column types with architecture §2.2
- Keep migration readable; comment story id at top of SQL
- Re-run IT

```bash
./mvnw -pl pipeline-api test -Dtest=FlywayBaselineIT,HealthControllerIT
```

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Boot with `local` | Flyway success in logs |
| 2 | `SHOW TABLES` | `tenants`, `flyway_schema_history` |

---

## 5. Docs & trackers

- [ ] KB Flyway baseline
- [ ] Tracker Done · `U,I,M,KB`
- [ ] TEST_MATRIX W0-US03
- [ ] WAVE_0 checklist: `V1__baseline.sql` checked

---

## 6. Ship

```text
merge → tag W0-US03 → delete → next story (US05 or US04 per sequence)
```

Delivery sequence in WAVE_0 prefers **US05 before US04**, but both only need US02.

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Editing `V1__` after apply → checksum error | Add `V2__...sql` instead |
| Flyway not on classpath | Add `flyway-core` + `flyway-mysql` |
| Wrong schema / user | Use DB `pipeline` matching Compose |
| IT without MySQL → red X | Use `assumeTrue` skip |
| Creating tables in Java instead of SQL | Migrations are the source of truth |

---

## Reference shape (this repo)

- `V1__baseline.sql` — `tenants` stub
- `FlywayBaselineIT` — table + history asserts
- Flyway enabled in `application.yml`
