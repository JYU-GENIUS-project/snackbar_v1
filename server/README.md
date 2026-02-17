# Server – Snackbar API Backend

TypeScript/Express service providing business logic for the kiosk and admin interfaces. The server exposes REST endpoints, handles authentication, persists data to PostgreSQL 18, and records immutable audit events.

## Getting Started

```bash
npm install
npm run dev
```

The default dev server binds to <http://localhost:3000> and reads configuration from environment variables or a `.env` file (see project root `.env.example`).

### Available Scripts

- `npm run dev` – start the API with ts-node-dev and live reload
- `npm run build` – compile TypeScript to `dist/`
- `npm run start` – run the compiled server
- `npm run test` – execute unit/integration tests (Jest + Supertest)
- `npm run lint` – run ESLint with TypeScript rules
- `npm run seed` – execute `scripts/seed.ts` to populate baseline data

## Manual Payment Confirmation Flow

- Creating a transaction (`POST /api/transactions`) responds with a `transactionId`, `transactionNumber`, and kiosk instructions; no third-party payment IDs are generated.
- The kiosk confirms successful payment with `POST /api/transactions/:id/confirm` supplying `{ declaredTender: string, attendantCode?: string, notes?: string }`.
- Confirmation requests require the transaction to be in `pending` state; the service persists the confirmation timestamp, channel (`kiosk` or `staff`), attendant metadata, and an immutable audit log entry.
- The confirmation handler emits `transaction.confirmed` events on the internal event bus so downstream consumers (notifications, reconciliation jobs) can react to kiosk-side approvals.
- Timeout handling is driven by `CONFIRMATION_TIMEOUT_SECONDS`; transactions exceeding this window without confirmation move to `abandoned` and surface on the admin dashboard for follow-up.

## Key Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/transactions` | Create a pending transaction and cart snapshot |
| POST | `/api/transactions/:id/confirm` | Mark a transaction as manually confirmed and persist audit metadata |
| GET | `/api/transactions` | Paginated admin view with confirmation status filters |
| GET | `/api/transactions/:id/audit` | Retrieve confirmation audit trail for reconciliation |
| GET | `/api/status/kiosk` | Current kiosk operating status (used by client watchdog) |
| GET | `/api/feed/products` | Product and availability feed for kiosk browsing |

## Configuration Reference

Add these variables to your environment (or `.env`):

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `CONFIRMATION_TIMEOUT_SECONDS` | `60` | Seconds before an unconfirmed transaction is considered abandoned |
| `CONFIRMATION_AUDIT_CHANNEL` | `database` | Target used by the audit writer (`database`, `syslog`, etc.) |
| `SESSION_TIMEOUT_MS` | `1800000` | Admin UI session inactivity timeout |
| `JWT_SECRET` | _required_ | JSON Web Token signing secret |
| `DB_HOST` | `postgres` | PostgreSQL hostname |

The Docker Compose file maps these variables and mounts persistent volumes for uploads and logs. See `docker-compose.yml` for production-aligned defaults.

## Middleware & Modules

- **Authentication:** JWT bearer auth with optional Google OAuth handshake for admin login.
- **Validation:** `express-validator` guards incoming payloads, including confirmation DTOs.
- **Error Handling:** Structured error responses with correlation IDs for log tracing.
- **Upload Handling:** `multer` streams product image uploads to `uploads/` with extension whitelisting.
- **Audit Logging:** `auditLogger` service records entity changes, including every confirmation attempt, in the `audit_logs` table.

## Development Tips

- Seed data (`npm run seed`) before exercising kiosk flows; the seed script inserts sample products and an admin account (`admin@example.com` / `ChangeMe!123`).
- To inspect confirmation audit trails locally, connect with `psql` and query `SELECT * FROM audit_logs WHERE entity_type = 'transaction' ORDER BY created_at DESC LIMIT 10;`.
- When running behind Nginx in development, ensure `/api` routes are proxied and WebSocket upgrades remain enabled for future real-time features.
