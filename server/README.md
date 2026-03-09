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

- Current implementation exposes `POST /api/transactions` for transaction creation and already persists confirmation metadata fields (`confirmation_channel`, `confirmation_reference`, `confirmation_metadata`) on the transaction row.
- The richer manual confirmation workflow for Phase 7 is specified in [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md).
- Planned Phase 7 work adds confirmation finalization, transaction audit retrieval, admin listing filters, timeout handling, and confirmation-service outage responses on top of the existing transaction creation baseline.

## Key Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/transactions` | Create a transaction record; Phase 7 should constrain kiosk usage to pending checkout snapshots |
| POST | `/api/transactions/:id/confirm` | Planned for Phase 7: finalize kiosk confirmation and persist audit metadata |
| GET | `/api/transactions` | Planned for Phase 7: paginated admin view with confirmation status filters |
| GET | `/api/transactions/:id/audit` | Planned for Phase 7: retrieve confirmation audit trail for reconciliation |
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
- **Validation:** `express-validator` guards incoming payloads; transaction creation DTOs are implemented today and confirmation DTOs are planned for Phase 7.
- **Error Handling:** Structured error responses with correlation IDs for log tracing.
- **Upload Handling:** `multer` streams product image uploads to `uploads/` with extension whitelisting.
- **Audit Logging:** `auditLogger` service records entity changes today; Phase 7 expands it with explicit transaction-confirmation audit actions defined in the backend handoff contract.

## Development Tips

- Seed data (`npm run seed`) before exercising kiosk flows; the seed script inserts sample products and an admin account (`admin@example.com` / `ChangeMe!123`).
- To inspect current transaction records locally, connect with `psql` and query `SELECT transaction_number, payment_status, confirmation_reference FROM transactions ORDER BY created_at DESC LIMIT 10;`.
- For the planned Phase 7 confirmation/audit contract, use [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md) as the source of truth.
- When running behind Nginx in development, ensure `/api` routes are proxied and WebSocket upgrades remain enabled for future real-time features.
