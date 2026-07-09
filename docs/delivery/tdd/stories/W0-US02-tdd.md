# W0-US02 TDD Guide — Spring Boot health + MySQL IT

| Field | Value |
|-------|--------|
| **Story** | W0-US02 — Spring Boot health + Compose MySQL IT |
| **Depends on** | W0-US01 (Compose MySQL) |
| **Branch** | `W0-US02` from `wave-0` |
| **Timebox hint** | 1–1.5 days |
| **You will touch** | parent `pom.xml`, `pipeline-api/`, Actuator, `HealthControllerIT` |
| **Stakeholder TDD** | [`../WAVE_0_TDD.md`](../WAVE_0_TDD.md) |
| **AC source** | [`../../waves/WAVE_0.md`](../../waves/WAVE_0.md) § W0-US02 |
| **KB** | [`../../kb/W0-US02-health-endpoint.md`](../../kb/W0-US02-health-endpoint.md) |

---

## What you are building (plain English)

A tiny Spring Boot app that starts, talks to MySQL, and answers `GET /actuator/health` with `"status":"UP"`. You prove it with an integration test.

**Done means:** With Compose MySQL up, `HealthControllerIT` is green and curl health returns UP.

**Note:** Prefer Testcontainers in CI when possible. On some Docker setups (e.g. Rancher Desktop + docker-java), use Compose MySQL + `assumeTrue` instead — that is OK for Wave 0 if documented.

---

## 0. Before you code

```bash
git checkout wave-0 && git pull
git checkout -b W0-US02
docker compose up -d mysql
# wait until healthy
```

Need: Java **21**, Maven Wrapper (`./mvnw`).

---

## 1. RED — failing IT first

### Create the test before the app works

File: `pipeline-api/src/test/java/com/pipelineplatform/api/HealthControllerIT.java`

```text
@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("local")
void health_returnsUp() {
  GET /actuator/health
  expect 200 + body contains "status":"UP" and "db"
}
```

Also add `@BeforeAll` that **skips** (does not fail the whole suite) if port `3306` is closed:

```text
assumeTrue(portOpen("127.0.0.1", 3306), "run: docker compose up -d mysql");
```

### Parent + module skeleton

You may need empty/minimal `pom.xml` + `PipelineApiApplication` so the project compiles. If the test cannot compile yet, create the **smallest** Boot main class and deps, then run the test and watch it fail on health/DB — that still counts as red.

### Run (expect FAIL or skip→fail when MySQL up)

```bash
docker compose up -d mysql
./mvnw -pl pipeline-api test -Dtest=HealthControllerIT
# Failure: no context / connection / 404 / not UP
```

**Stop.** Red achieved.

---

## 2. GREEN — minimal Boot + Actuator + JDBC

### Add / fix

1. Parent `pom.xml` — Spring Boot 3.x, Java 21, module `pipeline-api`
2. `pipeline-api/pom.xml` — `spring-boot-starter-web`, `actuator`, `jdbc`, `mysql-connector-j`, `spring-boot-starter-test`
3. `PipelineApiApplication.java` — `@SpringBootApplication`
4. `application.yml`:
   - expose `health` (details `always`, `db` enabled)
   - `local` profile: datasource URL `jdbc:mysql://localhost:3306/pipeline?...`, user/pass `pipeline`/`pipeline`
5. Surefire includes `**/*IT.java` if you name tests that way

### Run

```bash
./mvnw -pl pipeline-api test -Dtest=HealthControllerIT
# BUILD SUCCESS
```

Manual:

```bash
./mvnw -pl pipeline-api spring-boot:run -Dspring-boot.run.profiles=local
curl -s http://localhost:8080/actuator/health
# {"status":"UP", ... "db":...}
```

### Checklist

- [ ] IT green with MySQL up
- [ ] IT **skipped** (not errored) when MySQL down
- [ ] No tenant/pipeline REST controllers yet

---

## 3. REFACTOR

- Keep `local` profile clear (datasource only there).
- Comment in IT why Compose is used vs Testcontainers.
- Align module layout with Wave 0 target tree in `WAVE_0.md`.

```bash
./mvnw -pl pipeline-api test -Dtest=HealthControllerIT
```

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | `docker compose up -d mysql` | Healthy |
| 2 | `spring-boot:run` + `local` | App starts |
| 3 | `curl .../actuator/health` | `"status":"UP"` |

---

## 5. Docs & trackers

- [ ] KB health article
- [ ] Tracker Done · `U,I,M,KB` (or note Testcontainers deferral)
- [ ] TEST_MATRIX W0-US02
- [ ] WAVE_0 story status Done

---

## 6. Ship

```text
merge → tag W0-US02 → delete branch → W0-US03
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Hard-failing CI when Docker MySQL missing | Use `assumeTrue` / skip |
| Forgetting Actuator dependency | Health 404 |
| Wrong JDBC URL / password | Match Compose `pipeline`/`pipeline` |
| Putting business APIs in this story | Out of scope |
| Fighting Testcontainers for hours | Document deferral; ship Compose IT |

---

## Reference shape (this repo)

- `HealthControllerIT` — Compose MySQL + `/actuator/health`
- `application.yml` — `local` datasource + health exposure
- `PipelineApiApplication`
