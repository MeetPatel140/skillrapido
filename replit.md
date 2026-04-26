# SkillRapido — Service Marketplace App

## Overview

Rapido-style on-demand service marketplace. Customers post jobs, nearby providers receive real-time WebSocket notifications, swipe to accept/reject. Escrow wallet system with 10% platform commission. Full-stack pnpm monorepo.

## App Architecture

| Service | Port | Path | Description |
|---------|------|------|-------------|
| Express API | 8080 | `/api` | REST API + WebSocket (`/ws`) |
| React Frontend | 24403 | `/` | Mobile-UI React app (430px) + full-width admin ERP |

## Tech Stack

- **Frontend**: React + Vite + Wouter v3.9 + Tailwind CSS v4 (dark/light theme)
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL
- **WebSocket**: `ws` package — real-time job broadcasting to providers
- **Auth**: bcrypt + express-session + connect-pg-simple (persistent sessions, 30-day cookies)
- **Session store**: PostgreSQL `sessions` table (created by seed.ts on startup)

## Database Schema

Tables:
- `users` — id, name, email, phone, passwordHash, role (customer|provider|admin), bio, isBlocked, latitude, longitude
- `sessions` — sid, sess, expire (connect-pg-simple, created by seed.ts)
- `skills` — id, name, category, icon
- `providers` — id, userId, bio, isOnline, isVerified, rating, totalJobs, totalEarnings
- `provider_skills` — join table
- `jobs` — id, customerId, providerId, skillId, title, description, budget, status, address, lat, lng
- `bids` — id, jobId, providerId, amount, message, status
- `wallets` — id, userId, balance, escrowBalance
- `wallet_transactions` — id, walletId, type (credit|debit|escrow_hold|escrow_release|commission|withdrawal), amount
- `withdrawal_methods` — id, userId, type (bank|upi), account details, isDefault
- `withdrawal_requests` — id, userId, methodId, amount, status, adminNote
- `app_settings` — key, value, description (key-value platform config)
- `announcements` — id, title, body, type, targetRole, isActive, isPinned, expiresAt, createdBy
- `audit_logs` — id, adminId, action, targetType, targetId, details, ipAddress
- `coupons` — id, code, discountType, discountValue, minOrderAmount, usageLimit, usageCount, isActive
- `disputes` — id, jobId, raisedBy, reason, description, status, resolution
- `reviews` — id, jobId, reviewerId, revieweeId, rating, comment, isHidden, hiddenReason

## Business Logic

- Customer posts job → `budget * 1.1` held in escrow (10% commission)
- Phase 1 (5 min): broadcast to nearby (≤10km) providers with matching skills via WebSocket
- Phase 2: broadcast to any nearby (≤20km) providers
- Provider swipes right to accept, completes job, gets `budget * 0.9`
- On cancel: full refund from escrow

## Wallet & Withdrawals

- New accounts auto-get ₹500 welcome bonus wallet
- Wallet GET auto-creates wallet if missing (handles old accounts)
- Providers add bank/UPI withdrawal methods → request → admin approves/rejects

## Admin ERP Panel (Desktop, /admin/*)

**Credentials**: `admin@example.com` / `Admin`

Full-width desktop layout with grouped collapsible sidebar. 18 menu items across 7 groups:

| Group | Pages |
|-------|-------|
| Overview | Dashboard, Analytics |
| Users | All Users, Providers, Verification Queue, Blocked Users |
| Operations | All Jobs, Disputes, Reviews & Ratings |
| Finance | Wallets, Transactions, Withdrawals, Coupons & Offers |
| Content (CMS) | Announcements |
| Configuration | App Settings, Skills & Categories |
| System | Audit Logs, System Health |

Key features:
- Real-time badge counts (pending withdrawals, open jobs) polling every 30s
- Maintenance mode middleware blocks non-admins with 503 during maintenance
- All settings save with cache invalidation (`invalidateMaintenanceCache()`)

## Theme System

- `ThemeProvider` in `contexts/theme.tsx` — persists to localStorage `"theme"`
- Toggles `.dark` / `.light` class on `<html>` element
- Available in customer profile, provider profile, admin sidebar

## Maintenance Mode

- `artifacts/api-server/src/middleware/maintenance.ts` — in-memory cache (10s TTL)
- Blocks all non-admin API requests with 503 when `maintenance_mode = "true"` in app_settings
- Cache invalidated whenever settings are saved (both `/api/settings` and `/api/admin/settings`)

## Auth Middleware

- `requireAuth` — checks session userId, verifies user exists and not blocked
- `requireAdmin` — extends requireAuth with admin role check
- Both exported from `artifacts/api-server/src/lib/auth.ts`

## Key Files

- `lib/db/src/index.ts` — DB connection + pool export
- `lib/db/src/schema/` — all Drizzle table schemas
- `artifacts/api-server/src/routes/admin.ts` — admin CRUD routes
- `artifacts/api-server/src/routes/content.ts` — announcements, coupons, disputes, reviews, audit logs, analytics, system health
- `artifacts/api-server/src/routes/settings.ts` — platform settings with cache invalidation
- `artifacts/api-server/src/middleware/maintenance.ts` — maintenance mode blocking
- `artifacts/api-server/src/lib/seed.ts` — seeds admin user, settings, sessions table
- `artifacts/skillrapido/src/App.tsx` — all routes including 18 admin pages
- `artifacts/skillrapido/src/pages/admin/AdminLayout.tsx` — ERP sidebar layout (children wrapper)
- `artifacts/skillrapido/src/pages/admin/Admin*.tsx` — all admin page components

## API Route Map

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/wallet
POST   /api/wallet/topup
GET    /api/skills
GET    /api/jobs
POST   /api/jobs
GET    /api/providers/notifications
POST   /api/providers/notifications/:jobId/accept
POST   /api/providers/notifications/:jobId/reject
GET    /api/providers/earnings
GET    /api/providers/profile
PUT    /api/providers/profile
GET    /api/withdrawals/methods
POST   /api/withdrawals/methods
DELETE /api/withdrawals/methods/:id
GET    /api/withdrawals/requests
POST   /api/withdrawals/requests
GET    /api/settings
PUT    /api/settings
GET    /api/announcements          (public, filtered by role)
GET    /api/admin/stats
GET    /api/admin/users
PUT    /api/admin/users/:id
PUT    /api/admin/users/:id/block
POST   /api/admin/users/:id/wallet
GET    /api/admin/jobs
PUT    /api/admin/jobs/:id
GET    /api/admin/providers
PUT    /api/admin/providers/:id/verify
PUT    /api/admin/providers/:id
GET    /api/admin/withdrawals
PUT    /api/admin/withdrawals/:id
GET    /api/admin/transactions
GET    /api/admin/wallets
GET    /api/admin/skills
POST   /api/admin/skills
PUT    /api/admin/skills/:id
DELETE /api/admin/skills/:id
GET    /api/admin/settings
PUT    /api/admin/settings
GET    /api/admin/announcements
POST   /api/admin/announcements
PUT    /api/admin/announcements/:id
DELETE /api/admin/announcements/:id
GET    /api/admin/coupons
POST   /api/admin/coupons
PUT    /api/admin/coupons/:id
DELETE /api/admin/coupons/:id
GET    /api/admin/disputes
PUT    /api/admin/disputes/:id
GET    /api/admin/reviews
PUT    /api/admin/reviews/:id
GET    /api/admin/audit-logs
GET    /api/admin/analytics
GET    /api/admin/system-health
```

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/skillrapido run typecheck` — check frontend types
