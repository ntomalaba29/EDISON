# EDISON — Application Security Test & Controls Report

**Document Status**: Software Security Verification Complete · **Independent External Penetration Test**: `NOT COMPLETED` (`externalPenTestCompleted: false`)

---

## 1. Automated Dependency Audit (`npm audit --omit=dev`)

- **Execution Environment**: Isolated production dependency tree (`159` production packages, `242` total tree nodes)
- **Command**: `npm i --package-lock-only --legacy-peer-deps && npm audit --omit=dev --json`
- **Observed Vulnerability Counts**:
  - `critical`: **0**
  - `high`: **0**
  - `moderate`: **0**
  - `low`: **0**
  - `info`: **0**
  - `total`: **0**

---

## 2. Implemented & Verified Application Security Controls

| Security Domain | Mechanism Implemented | Verification Suite |
| :--- | :--- | :--- |
| **Authentication & Session Hygiene** | `crypto.scryptSync` salted password & profile-PIN hashing; SHA-256 `tokenHash` stored at rest (plaintext session token never persisted); 2-hour idle timeout + 7-day absolute cap; session rotation on privilege transitions; HTTP-only `SameSite=Lax` cookie + Bearer header parity. | `tests/securityHardening.test.ts` |
| **CSRF & Origin Guardrails** | Double-submit `csrfToken` enforcement via `edisonFetch` + same-origin validation across state-changing `POST`/`PUT`/`PATCH`/`DELETE` routes. | `tests/securityHardening.test.ts`, `tests/e2e/edison.spec.ts` |
| **API Input & Boundary Validation** | Strict `.strict()` Zod validation schemas (`src/server/validationSchemas.ts`) on all REST endpoints; `504` request timeout middleware; opaque JSON error envelopes hiding internal stack traces in responses. | `tests/securityHardening.test.ts`, `tests/fullJourneysIntegration.test.ts` |
| **Static Media & Path Confinement** | `/uploads/*` and `/rendered/*` served with `Content-Security-Policy: default-src 'none'; sandbox`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: same-origin`, canonical `fs.realpathSync` symlink containment, SVG/polyglot blocking, and pre-`path.basename` rejection of `/`, `\`, `..`, and NUL bytes inside `FfmpegMediaWorker`. | `tests/securityHardening.test.ts`, `tests/mediaWorker.test.ts` |
| **SQL Injection & Tenant Isolation** | 100% parameterised `$1..$N` queries across `PgQueryExecutor`, versioned SQL schema migrations with `CHECK` constraints (`charity_fee_zero`, `advertising_fee_independence`, `bundled_withdrawal`), `FOR UPDATE` tenant transaction lock (`assertHouseholdReadAccess`), and PostgreSQL append-only `audit_logs` trigger preventing `UPDATE`/`DELETE`. | `tests/postgresMigration.test.ts` |
| **Privacy, Consent & QR Revocation** | Track B `DEC-OPEN-01` bundled withdrawal bumping `consentEpoch`, immediately revoking `hqr_*` tokens (`HTTP 403`), SHA-256 DSR JSON export redacting `pinHash`, Right-to-Erasure anonymisation, recursive PII redaction in `src/server/logger.ts`, camera/mic hard-disable (`cameraMicAttentionTrackingEnabled: false`), and Zero-PII telemetry scanner. | `tests/trackB.test.ts`, `tests/privacyCompliance.test.ts` |
| **Export & Anti-SSRF Protections** | CSV formula-neutralization prefixing `=`, `+`, `-`, `@`, `\t`, `\r` in admin audit exports; URL protocol/host checks blocking private RFC1918/link-local QR targets (`qrValidator.ts`); zero silent overwrite of third-party external QR codes. | `tests/qrValidator.test.ts`, `tests/tvPlatformAdapter.test.ts` |
| **Hardware / Broadcast Safety** | Zero HDCP/DRM bypass (`hdcpAuthenticated` fail-closed check in `auraRemoteEngine.ts`), `<500ms` `FM-09` return-to-TV watchdog, and zero residential PII cross-border transfers (`prohibitCrossBorderPiiTransfer: true` in all regional manifests). | `tests/auraAndOemAdapters.test.ts`, `tests/reliabilityChaos.test.ts` |

---

## 3. Explicit External Security Boundary

- **External Third-Party Penetration Test**: `BLOCKED_EXTERNAL` (`externalPenTestCompleted: false`) — Independent CREST/OSCP-equivalent manual penetration test against staging cloud infrastructure is mandatory prior to Phase 13 commercial authorization or Phase 14 market activation.
- **KMS / Secret Storage**: Secrets (`SESSION_SECRET`, `DATABASE_URL`, `EDISON_FLEET_ATTESTATION_KEY_PEM`) must be injected solely via cloud Secret Manager / KMS; `.env` is excluded from Git and Docker image layers.
