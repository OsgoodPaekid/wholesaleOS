# WholesaleOS

A single full-stack app for running a wholesale business: products, purchases, sales, stock, expenses, customers, suppliers, and a profit dashboard. Frontend and backend live in **one** Next.js project, so there's nothing separate to deploy.

- **Framework:** Next.js (App Router) — pages and API routes in one codebase
- **Database:** PostgreSQL via Prisma (works with Neon or Supabase)
- **Auth:** email + password, JWT stored in an httpOnly cookie (Admin / Staff roles)
- **Costing:** FIFO — purchases create fixed-cost stock batches; sales use up the oldest first
- **Money & quantities:** exact decimals (supports 0.5 and 0.25 packs)
- **Deploy:** one click on Netlify, no separate backend server

---

## What you need

1. [Node.js](https://nodejs.org) 18.18 or newer
2. A free cloud Postgres database — pick one:
   - **Neon** (https://neon.tech) — simplest
   - **Supabase** (https://supabase.com)

---

## Run it locally

```bash
# 1. Install
npm install

# 2. Set up your environment file
cp .env.example .env
#    then open .env and paste your database URLs + a JWT secret (see below)

# 3. Create the database tables
npm run db:migrate      # name the migration "init" when asked

# 4. Add starter data (admin user, sample products, opening stock)
npm run db:seed

# 5. Start
npm run dev
```

Open http://localhost:3000 and sign in:

- **Admin:** `admin@wholesale.com` / `Admin1234!`
- **Staff:** `staff@wholesale.com` / `Staff1234!`

> Change these passwords before real use.

### Filling in `.env`

```env
# Pooled URL — the app uses this at runtime (safe for serverless)
DATABASE_URL="postgresql://...-pooler...?sslmode=require"

# Direct URL — Prisma uses this only for migrations/seeding
DIRECT_URL="postgresql://...(no -pooler)...?sslmode=require"

# Any long random string
JWT_SECRET="paste-a-long-random-string-here"
```

- **Neon:** the pooled URL has `-pooler` in the host; the direct URL doesn't. Both are in your Neon dashboard.
- **Supabase:** use the Supavisor **pooler** URL (add `?pgbouncer=true`) for `DATABASE_URL`, and the direct connection for `DIRECT_URL`.
- Generate a secret with: `openssl rand -base64 48`

---

## Deploy to Netlify (one click after this)

1. Push this project to GitHub.
2. In Netlify: **Add new site → Import from GitHub**, and pick the repo. Netlify detects Next.js automatically and installs its official Next.js runtime — no extra config needed.
3. Add your environment variables in **Site settings → Environment variables**: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`.
4. Before your first deploy (or once, from your own machine), create the tables against the cloud database:
   ```bash
   npm run db:deploy    # applies migrations to the DATABASE_URL in your .env
   npm run db:seed      # optional: starter data
   ```
5. Deploy. Every future `git push` redeploys automatically.

That's it — the API routes run as serverless functions on the same site, so there's no Render/Railway/VPS to manage.

> **Note on serverless limits:** API routes on Netlify's free tier must finish within ~10 seconds (26s on paid). Every route here is a quick database call, so that's plenty. Keep it in mind if you later add heavy report generation.

---

## Project structure

```
wholesaleos/
├─ prisma/
│  ├─ schema.prisma        # data model (FIFO batches, decimal quantities)
│  └─ seed.ts              # starter data
├─ src/
│  ├─ app/
│  │  ├─ api/              # backend — one folder per resource
│  │  │  ├─ auth/          # login, logout, me
│  │  │  ├─ products/      # list, create, update, delete
│  │  │  ├─ purchases/     # create purchase → makes FIFO stock batches
│  │  │  ├─ sales/         # create sale → consumes oldest batches, records profit
│  │  │  ├─ stock/         # manual stock adjustments (decimal-safe)
│  │  │  ├─ categories/  suppliers/  customers/  expenses/
│  │  │  └─ dashboard/     # totals, monthly chart, recent sales
│  │  ├─ (app)/            # signed-in pages (dashboard, products, …)
│  │  ├─ login/            # sign-in page
│  │  ├─ layout.tsx  page.tsx  globals.css
│  ├─ lib/
│  │  ├─ prisma.ts         # shared database client
│  │  ├─ auth.ts           # JWT + password hashing + session cookie
│  │  ├─ money.ts          # decimal-safe money/quantity helpers
│  │  ├─ validation.ts     # input rules (0.25-step quantities)
│  │  ├─ http.ts           # JSON responses + auth guards + error handling
│  │  └─ client.ts         # tiny browser fetch wrapper
│  └─ middleware.ts        # redirects signed-out users to /login
├─ netlify.toml            # build command + Node version
└─ .env.example
```

### What's fully built vs. easy to extend

Fully working end-to-end: **auth, products, purchases (FIFO in), sales (FIFO out + profit), stock adjustments, categories, suppliers, customers, expenses, dashboard.** The UI ships with the **Login, Dashboard, and Products** screens.

The remaining screens (Purchases, Sales, Stock, Expenses, Customers, Suppliers) follow the exact same pattern as `products/page.tsx`: fetch a list from `/api/<thing>`, show a table, POST a form to create. Their APIs already exist, so each new page is just a table + form.

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start locally |
| `npm run db:migrate` | Create/apply a migration (use this, **never** `db push`) |
| `npm run db:seed` | Load starter data |
| `npm run db:studio` | Open Prisma Studio to inspect the database |
| `npm run db:reset` | Wipe and rebuild the database (destructive) |
| `npm run build` | Production build (runs `prisma generate` first) |

---

## Notes on money accuracy

Every amount and quantity is stored as `Decimal(12,2)` and all arithmetic uses Prisma's `Decimal` methods (`.plus()`, `.minus()`, `.times()`), never plain JavaScript `+`/`-` — so a half pack stays `0.5`, not `0.4999…`. Input validation enforces quantities in steps of `0.25`.
