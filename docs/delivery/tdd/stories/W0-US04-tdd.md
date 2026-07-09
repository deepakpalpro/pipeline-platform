# W0-US04 TDD Guide — Structured logging + Prometheus

| Field | Value |
|-------|--------|
| **Story** | W0-US04 — Structured logging + Micrometer smoke |
| **Depends on** | W0-US02 |
| **Branch** | `W0-US04` from `wave-0` |
| **Timebox hint** | 0.5–1 day |
| **You will touch** | `micrometer-registry-prometheus`, `application.yml`, `logback-spring.xml`, ITs |
| **Stakeholder TDD** | [`../WAVE_0_TDD.md`](../WAVE_0_TDD.md) |
| **AC source** | [`../../waves/WAVE_0.md`](../../waves/WAVE_0.md) § W0-US04 |
| **KB** | [`../../kb/W0-US04-logging-prometheus.md`](../../kb/W0-US04-logging-prometheus.md) |

---

## What you are building (plain English)

1. **Prometheus scrape:** `GET /actuator/prometheus` returns text metrics including `jvm_memory_used_bytes`.
2. **Structured logs:** console logs are JSON (Logstash-style), not random plaintext with secrets.

**Done means:** `PrometheusEndpointIT` green; logs look like JSON; KB documents scrape URL.

---

## 0. Before you code

```bash
git checkout wave-0 && git pull
git checkout -b W0-US04
docker compose up -d mysql   # ITs use local profile
```

---

## 1. RED — failing Prometheus IT (+ logging smoke)

### Create

1. `PrometheusEndpointIT` — same Compose MySQL assume pattern as health IT:

```text
GET /actuator/prometheus
expect 200
body contains "jvm_memory_used_bytes"
```

2. `StructuredLoggingSmokeTest` (config smoke):

```text
logging.structured.format.console == "logstash"
spring.application.name == "pipeline-api"
logback-spring.xml is on classpath
```

### Run (expect FAIL)

```bash
./mvnw -pl pipeline-api test -Dtest=PrometheusEndpointIT,StructuredLoggingSmokeTest
# 404 on prometheus and/or missing property
```

**Stop.** Red.

---

## 2. GREEN — registry + exposure + structured logging

### Add / change

1. Dependency: `io.micrometer:micrometer-registry-prometheus`
2. `application.yml`:

```yaml
logging:
  structured:
    format:
      console: logstash

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    prometheus:
      enabled: true
  prometheus:
    metrics:
      export:
        enabled: true
```

3. `logback-spring.xml` — use Boot’s **structured** console appender (not the plain `console-appender.xml`), or structured format won’t apply:

```xml
<include resource="org/springframework/boot/logging/logback/structured-console-appender.xml"/>
```

### Run

```bash
./mvnw -pl pipeline-api clean test -Dtest=PrometheusEndpointIT,StructuredLoggingSmokeTest
# SUCCESS — and console shows JSON lines during the run
```

Manual:

```bash
./mvnw -pl pipeline-api spring-boot:run -Dspring-boot.run.profiles=local
curl -s http://localhost:8080/actuator/prometheus | head
# jvm_memory_used_bytes ...
```

### Checklist

- [ ] Actuator log says exposing **3** endpoints (health, info, prometheus) — if still 2, config not loaded / clean rebuild
- [ ] No passwords in log messages
- [ ] Prefer `clean test` after yaml/logback changes

---

## 3. REFACTOR

- Keep metrics tags simple (`application: pipeline-api`)
- Comment in logback that Wave 4 will extend ELK
- Re-run health + prometheus ITs together

```bash
./mvnw -pl pipeline-api test -Dtest=HealthControllerIT,PrometheusEndpointIT,StructuredLoggingSmokeTest
```

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Scrape `/actuator/prometheus` | Metrics text; JVM memory series |
| 2 | Watch console on startup | JSON fields (`@timestamp`, `level`, `message`) |

Local scrape URL: `http://localhost:8080/actuator/prometheus`

---

## 5. Docs & trackers

- [ ] KB logging + Prometheus
- [ ] Tracker Done · `U,I,M,KB`
- [ ] TEST_MATRIX W0-US04
- [ ] WAVE_0 checklist: logback + prometheus checked

---

## 6. Ship

```text
merge → tag W0-US04 → delete branch
```

(Often last Wave 0 story if US05 already merged.)

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Expose `prometheus` but no micrometer registry | Add `micrometer-registry-prometheus` |
| Custom `logback-spring.xml` includes **plain** console appender | Use `structured-console-appender.xml` |
| Stale `target/` after yaml change | `./mvnw -pl pipeline-api clean test` |
| Logging DB password | Never log datasource password |
| Expecting Grafana in this story | Out of scope (Wave 4) |

---

## Reference shape (this repo)

- `PrometheusEndpointIT`
- `StructuredLoggingSmokeTest`
- `logback-spring.xml` + `logging.structured.format.console=logstash`
