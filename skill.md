# ShopLedger Legacy Workshop – Development Skill

**Purpose:** Document the technology stack, module layout, runtime commands, and enforced development rules for this project. All content reflects the state of the codebase as of 2026-11-22.

## Stack
- **Runtime:** Node.js (compatible with the `package.json` engines; no explicit engine constraint in package.json)
- **Framework:** Express.js (`express` ^4.17.1)
- **Data Store:** Plain JSON file (`data/db.json`) read/written via `fs` – no database driver, no ORM
- **Serialization:** `JSON.parse` / `JSON.stringify` with `null, 2` formatting
- **HTTP Middleware:** `body-parser` (built-in to Express ^4.17+, explicitly declared)
- **No external testing framework:** `npm test` currently prints `"Error: no test specified"`
- **No OAuth, no auth middleware, no session store:** session handling is manual (khata uses ledger in-memory)

## Short Module Map
```
shopledger-legacy-workshop/
├─ server.js              # Entry point: creates express app, mounts routes, starts listener
├─ config.js              # Shop metadata, tax HSN slabs, inventory defaults, active coupons
├─ package.json           # Dependencies: body-parser, express; scripts: start, test
├─ data/
│  └─ db.json           # Persistent JSON: products, customers, orders, settlements, auditLog, ID counters
├─ lib/
│  ├─ store.js          # fs-reader/writer, ensureStructure, appendAudit (capped at 100 entries)
│  ├─ orders.js         # add, get, list, cancel – order lifecycle
│  ├─ inventory.js      # check, reserve, release, getSellableStock, summarize
│  ├─ pricing.js        # subtotal, discount (via coupons), computeTotals with HSN slab tax
│  ├─ tax.js            # getRateForItem (HSN lookup + fallback defaultRate), splitCgstSgst, round2
│  ├─ ledger.js         # chargeOrderToKhata, reverseOrderDebit, recordSettlement, listCustomers
│  ├─ coupons.js        # normalizeCode, validate, calculateDiscount, listActive
│  ├─ dates.js          # today(), normalizeDateKey, getFiscalYear
│  └─ invoice.js        # render – HTML invoice view (referenced in server.js comment)
├─ routes/
│  ├─ products.js       # GET /api/products, GET /api/coupons
│  ├─ orders.js         # GET /api/orders, POST /api/orders, POST /orders/:id/cancel
│  ├─ customers.js      # GET /api/customers, POST /api/customers/:id/settle
│  └─ reports.js        # (sparse; no active routes beyond scaffolding)
├─ public/              # Static assets (served via express.static)
└─ docs/                # This folder; architecture diagram etc.
```

## Runtime Commands
- `npm start` – equivalent to `node server.js`
- `node server.js` – starts the server on `config.port` (default: 3000); outputs `"ShopLedger listening on http://localhost:3000"`
- `npm test` – currently unfixed; prints `"Error: no test specified && exit 1"`

## Enforced Development Rules
1. **Write characterization tests before changing behaviour.** Any modification to a `lib/` module must be preceded by tests that capture the module's current input/output semantics. These tests serve as a safety net and regression guard.
2. **Change only the module the ticket is about.** Scope is strict: a ticket affecting `inventory.js` must not alter `pricing.js` or `orders.js`. If cross-module impact is suspected, create a tracking issue before touching code.
3. **Tests never touch `data/db.json` directly.** All test interactions with the data store must go through the `lib/store.js` interface (`store.read()`, `store.write()`, `store.appendAudit()`). Direct `fs` operations on `db.json` in tests are prohibited.
4. **Add no dependencies.** The `package.json` may not be modified to introduce new runtime dependencies. If new functionality requires a utility, it must be implemented inline using Node.js built-in APIs (`fs`, `path`, `crypto`, etc.) or refactored into the existing `lib/` modules.

## Notes for AI Agents
- When implementing a fix or feature, first run the existing project (via `npm start`) to confirm baseline behaviour.
- Before editing any `lib/` file, read it fully; the codebase uses consistent `round2()` helpers and `Number()` casting patterns.
- Audit log entries are automatically capped at 100 entries – any test asserting audit behaviour must respect this boundary.
- The `adminKey` in `config.js` (`shopledger-admin-2021`) is a hardcoded secret; do not hardcode new secrets, and do not expose it in tests or logs.