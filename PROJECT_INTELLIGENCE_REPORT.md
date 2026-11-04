# PROJECT INTELLIGENCE REPORT

**Audit scope:** Static, read-only review of the tracked repository at commit `05b4504` (`main`), including the Next.js application, server actions, middleware, Supabase migrations, package manifests, and tracked configuration.  
**Audit date:** 2026-11-03  
**Important limitation:** No live Supabase catalog, production environment variables, storage policies, Vercel deployment settings, user data, or production telemetry were queried. Database details below distinguish explicit repository evidence from handwritten TypeScript schema declarations and external assumptions.

## 1. Executive Summary

- **Project name:** SDA-Projects / `sda-platform`
- **Main purpose:** Arabic, RTL government-administration platform for Southern Development Authority, with HR, project portfolio, archive, and administrative modules.
- **Current status:** Broad functional MVP/pilot. The repository has production build configuration and a successful recent Next.js production build, but it does not demonstrate a complete, tested, least-privilege enterprise deployment. The last observed Vercel deployment attempt was blocked by commit-author permissions; the later push of the corrected-author commit is visible in Git, but production activation was not re-verified in this audit.
- **Technology stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, Recharts, Lucide, bcryptjs, Vercel-oriented deployment.
- **Estimated completion:** **~60% for the visible product scope** (broad user-facing modules exist; important workflows remain partial, and operational/enterprise controls are not demonstrated). This is an architectural estimate, not a feature-by-feature acceptance test or delivery metric.

The application is a single Next.js codebase with 28 files marked as Server Actions, a Supabase browser/server/admin access pattern, and 17 SQL files in `sda-platform/supabase/migrations`. Most sensitive server-side data access uses a Supabase service-role client, which bypasses RLS and therefore makes the application’s own authorization checks a critical security boundary. HR module actions in particular use a signed module cookie and service-role queries without consistently enforcing user roles or employee-level data boundaries.

## 2. System Architecture

### Frontend architecture

- Next.js App Router under `sda-platform/app`.
- React client components implement interactive forms, tables, filtering, modals, import/export, and notifications. Server Components load initial data and enforce some route-level authorization.
- Tailwind CSS 4 utilities and custom global CSS. Arabic text and RTL are used throughout; UI is primarily Arabic.
- Recharts is used in dashboard/report visualizations. `lucide-react` supplies icons.
- Several feature workspaces are large client components; the employee master screen, for example, combines dashboard, employee editing, import, profile photo, and print-card concerns in one file.
- There are some direct browser Supabase operations (login, avatar storage, and the legacy `/promotions` screen); most other database access is via server actions.

### Backend architecture

- No standalone API service. Business operations are implemented as Next.js Server Actions (`'use server'`) and server-side page functions.
- Service modules under `app/actions` and feature-local `actions.ts` files use the Supabase JS client.
- Most CRUD actions instantiate the admin/service-role client. Some modules explicitly authorize a platform actor/role before using it; others require only an HR/archive module token.
- SQL functions generate project/archive identifiers and a trigger synchronizes project completion on tracking inserts.
- No conventional `app/api/**/route.ts` handlers or Supabase Edge Functions are tracked.

### Database architecture

- Supabase PostgreSQL, accessed through PostgREST via `@supabase/supabase-js`.
- Schema is described partly by 17 SQL migration-like files and partly by a manually maintained `AdminDatabase` type in `app/actions/server-auth.ts`.
- Core tables including `profiles`, `employees`, `leaves`, and `attendance` are referenced throughout the application but are **not created by the tracked migrations**. Their production schemas, constraints, indexes, policies, and migration history cannot be verified from this repository.
- RLS is explicitly enabled on many feature tables. A number of those migrations provide no policies, which means ordinary non-owner/anon roles generally fail closed, while server actions using `service_role` bypass those protections.
- No generated Supabase schema file or checked-in `supabase/config.toml` is present. `Relationships: []` in the handwritten type is not evidence that the actual database has no foreign keys.

### Authentication architecture

1. `/login` uses the browser Supabase client and `signInWithPassword` with email/password.
2. The application resolves the authenticated user server-side with `auth.getUser()` and loads the user's `profiles.role`.
3. HR and archive have an additional username/password login. The action verifies a bcrypt hash from `module_access` using the service role and issues an 8-hour signed HMAC token in an HttpOnly, SameSite=Strict cookie.
4. Middleware checks for a Supabase cookie with a project-specific name prefix and validates the module-cookie HMAC, module claim, and expiry.
5. Server actions have their own authorization checks; middleware is not the sole data-access control.

### Storage architecture

- Supabase Storage buckets are created/updated by SQL for `archive_files` (private, 15 MB), `employee-documents` (private, 15 MB), `employee-training-certificates` (private, 15 MB), and `project-field-photos` (private, 5 MB).
- Archive upload uses signed upload URLs and signed download URLs. HR document and training/photo paths use server-side service-role Storage operations and signed downloads.
- Employee profile photos use a browser client and a public `avatars` bucket, but that bucket and its Storage policies are not defined by the tracked migrations.
- No object lifecycle, retention, malware-scanning, AV quarantine, or storage-policy migration is present.

### Deployment architecture

- The application package and build configuration live under `sda-platform`; Vercel metadata exists in the working tree but is ignored from source control.
- `next build` is the production build. Previous validation in this work context succeeded; ESLint reported no errors and 14 warnings (primarily existing `<img>` usage and one config export warning).
- Root `package.json` is a small dependency-only manifest with no scripts; the actual app has its own `package.json`, scripts, and lockfile. Running `npm run build` at repository root is not the configured build path.
- No checked-in CI workflow, `vercel.json`, container definition, infrastructure-as-code, environment schema, deployment runbook, or automated rollback procedure was found.

## 3. Technologies Used

Resolved top-level versions observed from the application install (`npm list --depth=0`):

| Technology / package | Version |
|---|---:|
| Node.js runtime | Not pinned in repository |
| Next.js | 16.4.3 |
| React | 19.3.0 |
| React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 |
| `@tailwindcss/postcss` | 4.3.3 |
| `@tailwindcss/turbopack` | 4.3.3 |
| PostCSS | 8.5.32 |
| `@supabase/ssr` | 0.12.7 |
| `@supabase/supabase-js` | 2.118.0 |
| Recharts | 3.10.1 |
| lucide-react | 1.66.0 |
| bcryptjs | 3.0.3 |
| jsPDF | 4.2.1 |
| jspdf-autotable | 5.0.9 |
| xlsx | 0.20.3 resolved; manifest uses a SheetJS tarball URL |
| ESLint | 9.39.5 |
| `eslint-config-next` | 16.4.3 |
| `@types/node` | 20.19.43 |
| `@types/react` | 19.3.0 |
| `@types/react-dom` | 19.3.0 |
| Supabase | Hosted service dependency; project URL has a source-code fallback |
| Vercel | Deployment platform; linked metadata present locally, deployment not confirmed active |
| Google Fonts | Cairo is requested by global CSS via external CSS `@import` |

Version declarations/ranges are in `sda-platform/package.json`; the resolved versions above are from the installed top-level dependency tree. No supported Node version is declared.

## 4. Folder Structure

The tree below is the tracked application/repository source shape. Generated `.next`, dependencies, and ignored Vercel build metadata are intentionally excluded.

```text
SDA-Projects/
├── .gitignore
├── package.json                         # Root dependency-only manifest; no app scripts
├── package-lock.json                    # Root lockfile
├── PROJECT_INTELLIGENCE_REPORT.md       # This audit report
└── sda-platform/
    ├── .enf.local                       # Tracked env-like file; name is not covered by .env* ignore
    ├── .gitignore
    ├── AGENTS.md
    ├── README.md                        # Generic create-next-app README
    ├── eslint.config.mjs
    ├── middleware.ts                    # Route gating and module-token validation
    ├── next.config.ts                   # Next config; 6 MB Server Action body limit
    ├── package.json                     # Actual application scripts/dependencies
    ├── package-lock.json
    ├── postcss.config.mjs
    ├── tsconfig.json                    # Strict TS; excludes promotions/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx                     # Landing
    │   ├── login/page.tsx
    │   ├── hr/login/page.tsx
    │   ├── archive/
    │   │   ├── login/{page.tsx,actions.ts}
    │   │   ├── dashboard/{page.tsx,archive-dashboard.tsx}
    │   │   └── module-auth.ts
    │   ├── actions/
    │   │   ├── admin-backup.ts
    │   │   ├── admin-reports-types.ts
    │   │   ├── admin-reports.ts
    │   │   ├── admin-settings.ts
    │   │   ├── create-user.ts
    │   │   ├── delete-user.ts
    │   │   ├── get-all-users.ts
    │   │   ├── get-audit-logs.ts
    │   │   ├── hr-session.ts
    │   │   ├── log-action.ts
    │   │   ├── logout.ts
    │   │   ├── manage-user.ts
    │   │   ├── module-login.ts
    │   │   ├── notifications.ts
    │   │   └── server-auth.ts
    │   └── dashboard/
    │       ├── layout.tsx
    │       ├── page.tsx
    │       ├── archive/{page.tsx,actions.ts,archive-client.tsx,archive-departments.ts}
    │       ├── attendance/page.tsx
    │       ├── audit-logs/{page.tsx,loading.tsx,audit-logs-client.tsx}
    │       ├── backup/{page.tsx,backup-client.tsx}
    │       ├── employees/
    │       │   ├── page.tsx
    │       │   ├── actions.ts
    │       │   ├── promotion-eligibility.ts
    │       │   ├── archive/{page.tsx,actions.ts}
    │       │   ├── assets/{page.tsx,actions.ts}
    │       │   ├── attendance/{page.tsx,actions.ts}
    │       │   ├── clearances/{page.tsx,actions.ts,print-button.tsx,[id]/print/page.tsx}
    │       │   ├── correspondences/page.tsx
    │       │   ├── custody/page.tsx
    │       │   ├── decisions/{page.tsx,actions.ts,decisions-client.tsx,[id]/print/{page.tsx,print-button.tsx}}
    │       │   ├── delegations/{page.tsx,actions.ts}
    │       │   ├── evaluations/page.tsx
    │       │   ├── hr-records/actions.ts
    │       │   ├── organization/{page.tsx,actions.ts,organization-client.tsx}
    │       │   ├── penalties/page.tsx
    │       │   ├── promotions/page.tsx
    │       │   ├── reports/{page.tsx,actions.ts}
    │       │   └── trainings/page.tsx
    │       ├── leaves/{page.tsx,actions.ts}
    │       ├── projects/
    │       │   ├── page.tsx
    │       │   ├── actions.ts
    │       │   ├── strategic-actions.ts
    │       │   ├── project-options.ts
    │       │   ├── projects-command-center.tsx
    │       │   ├── sector-projects-workspace.tsx
    │       │   ├── loading.tsx
    │       │   ├── [module]/page.tsx
    │       │   ├── finance/{page.tsx,finance-view.tsx}
    │       │   ├── gis/page.tsx
    │       │   ├── health-education/page.tsx
    │       │   ├── investments/{page.tsx,investments-workspace.tsx}
    │       │   ├── lands/{page.tsx,lands-workspace.tsx}
    │       │   ├── minerals/page.tsx
    │       │   ├── tracking/{page.tsx,tracking-workspace.tsx}
    │       │   ├── urban/page.tsx
    │       │   └── visits/{page.tsx,field-visits-workspace.tsx}
    │       ├── reports/{page.tsx,loading.tsx,reports-client.tsx}
    │       ├── settings/{page.tsx,settings-form.tsx}
    │       ├── settings/modules/{page.tsx,actions.ts,modules-client.tsx}
    │       └── users/{page.tsx,users-client.tsx}
    ├── components/
    │   ├── auth/ModuleLoginForm.tsx
    │   └── layout/{NotificationBell.tsx,Sidebar.tsx}
    ├── promotions/page.tsx               # Legacy root-level promotion screen
    ├── public/
    │   ├── logo.jpg
    │   ├── file.svg
    │   ├── globe.svg
    │   ├── next.svg
    │   ├── vercel.svg
    │   └── window.svg
    ├── supabase/migrations/              # 17 SQL files; see Database Analysis
    ├── types/department.ts
    └── utils/supabase/{client.ts,config.ts}
```

**Major folder purposes:** `app` contains App Router pages and server actions; `components` holds shared login/navigation/notification UI; `supabase/migrations` contains partial schema changes; `utils/supabase` initializes browser and environment clients; `types` contains shared domain types; `public` contains static branding/assets. `promotions/` sits outside `app/` and is a legacy route with different auth/data-access patterns.

## 5. Database Analysis

### Scope and confidence

There are **30 table entries** in the handwritten `AdminDatabase` TypeScript type. SQL migrations explicitly create/alter a subset. The four core tables `profiles`, `employees`, `leaves`, and `attendance` lack their foundational `CREATE TABLE` migrations. Some additional runtime references (notably `promotions`) are absent from both this type and tracked SQL. Therefore, the catalog below is the **repository-visible schema**, not a verified live database dump.

`RLS: enabled / policy …` describes policies found in tracked SQL only. Existing production policies may have been created manually or by untracked migrations and cannot be confirmed.

### Table-by-table inventory

#### Identity and administration

| Table | Purpose and columns visible in repository | Relationships / foreign keys | Indexes in tracked SQL | RLS / policies in tracked SQL |
|---|---|---|---|---|
| `profiles` | Platform profile and role: `id`, `full_name`, `role` (from handwritten type and usage) | App creates `id` equal to Auth user ID; FK to `auth.users` is plausible but not defined by tracked SQL | None visible | No DDL or policy visible; actual schema/RLS unknown |
| `system_settings` | System identity/contact configuration: `id`, `system_name`, `system_logo_url`, `contact_email`, `contact_phone`, `address`, `updated_at`; seeded with one fixed UUID | None | PK on `id` | RLS enabled, but no policy visible |
| `audit_logs` | `id`, `actor_id`, `actor_name`, `actor_email`, `action` (`add/update/delete`), `details`, `ip_address`, `created_at` | `actor_id → auth.users(id) ON DELETE SET NULL` | `created_at DESC` | RLS enabled; SELECT policy for authenticated profiles with `role='it_manager'`. Application action also allows `admin_manager` using service role |
| `module_access` | Secondary module credentials: `id`, `employee_id`, `module_name` (`archive/hr`), `username`, `password_hash`, `is_active`, `created_at` | `employee_id → employees(id)` (delete action not specified) | PK; unique `username` | RLS enabled, no policies visible; operations use service role |
| `departments` | Organization tree: `id`, `name`, `type`, `parent_id`, `manager_id`, `created_at` | `parent_id → departments(id)`; `manager_id → employees(id)` | PK only visible | RLS enablement/policies not present in tracked SQL |

#### Human resources

| Table | Purpose and columns visible in repository | Relationships / foreign keys | Indexes in tracked SQL | RLS / policies in tracked SQL |
|---|---|---|---|---|
| `employees` | HR master record: `id`, `full_name`, `employee_number`, `national_id`, `work_start_date`, `birth_date`, `birth_place`, `nationality`, `social_status`, `gender`, `qualification`, `major`, `university`, `hire_date`, `job_title`, `department`, `grade`, `category`, `rank`, `last_promotion_date`, `basic_salary`, `variable_salary`, `phone`, `address`, `email`, `employment_status`, `delegation_entity`, `branch`, `job_type`, `notes`, `photo_url`, `delegation_start_date`, `delegation_end_date`, `leave_balance`, `department_id`, `direct_manager_id`, `created_at` (handwritten type plus additive SQL) | `department_id → departments(id)`; `direct_manager_id → employees(id)`; `departments.manager_id → employees(id)` | No employee indexes visible in tracked SQL | Insert policy allows `president`, `vice_president`, `admin_manager`, `it_manager`; no tracked SELECT/UPDATE/DELETE policy. Base RLS state unknown |
| `leaves` | Leave workflow: `id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `days_count`, `notes`, `status`, `manager_id`, `manager_notes`, `created_at` (handwritten type and add-column migrations) | `employee_id → employees(id)` is used in code; `manager_id → employees(id)` explicitly added | None visible | Base RLS and policies unknown |
| `attendance` | Time records: `id`, `employee_id`, `check_in`, `check_out`, `status`, `late_minutes` (handwritten type and additive migration) | `employee_id` is used as employee reference; no base FK DDL visible | None visible | Base RLS and policies unknown |
| `leave_types` | Leave policy lookup: `id`, `name`, `max_days_per_year` | None | Unique `name` | RLS enabled, no policies visible |
| `permissions` | Short permission requests: `id`, `employee_id`, `date`, `duration_hours`, `reason`, `status`, `manager_id`, `manager_notes`, `created_at` | `employee_id → employees(id) ON DELETE CASCADE`; `manager_id → employees(id) ON DELETE SET NULL` | `(employee_id,date DESC)`; `(manager_id,status,created_at DESC)` | RLS enabled, no policies visible |
| `hr_decisions` | Employee decision history: `id`, `employee_id`, `decision_type`, `decision_number`, `decision_date`, `details`, `old_value`, `new_value`, `created_at` | `employee_id → employees(id) ON DELETE RESTRICT` | `(employee_id,decision_date DESC)` | RLS enabled, no policies visible |
| `penalties` | Disciplinary records: `id`, `employee_id`, `violation_type`, `description`, `decision_number`, `decision_date`, `penalty_type`, `status`, `created_at` | `employee_id → employees(id) ON DELETE RESTRICT` | `(employee_id,decision_date DESC)` | RLS enabled, no policies visible |
| `trainings` | Training/certificate records: `id`, `employee_id`, `course_name`, `provider`, `start_date`, `end_date`, `certificate_url`, `notes`, `created_at` | `employee_id → employees(id) ON DELETE RESTRICT`; check `end_date IS NULL OR end_date >= start_date` | `(employee_id,start_date DESC)` | RLS enabled, no policies visible |
| `evaluations` | Annual appraisal: `id`, `employee_id`, `year`, `evaluator_id`, `score`, `notes`, `status`, `created_at` | `employee_id → employees(id) ON DELETE RESTRICT`; `evaluator_id → employees(id) ON DELETE SET NULL` | `(employee_id,year DESC,created_at DESC)` | RLS enabled, no policies visible |
| `clearances` | Exit clearance: `id`, `employee_id`, `request_date`, `status`, `notes`, `created_at` | `employee_id → employees(id) ON DELETE RESTRICT` | `(employee_id,request_date DESC)` | RLS enabled, no policies visible |
| `correspondences` | Incoming/outgoing correspondence metadata: `id`, `type`, `reference_number`, `subject`, `date`, `related_employee_id`, `notes`, `created_at` | `related_employee_id → employees(id) ON DELETE SET NULL` | `(date DESC)` | RLS enabled, no policies visible |
| `assets` | Assigned equipment/custody: `id`, `employee_id`, `asset_name`, `serial_number`, `status`, `delivered_date`, `returned_date`, `created_at` | `employee_id → employees(id) ON DELETE RESTRICT` | `(employee_id,status)` | RLS enabled, no policies visible |
| `documents` | Employee document metadata: `id`, `employee_id`, `document_type`, `file_url`, `file_name`, `created_at` | `employee_id → employees(id) ON DELETE CASCADE` | `(employee_id,created_at DESC)` | RLS enabled, no policies visible |
| `notifications` | HR notifications: `id`, `employee_id`, `title`, `message`, `link`, `is_read`, `created_at` | `employee_id → employees(id) ON DELETE CASCADE` | `(employee_id,created_at DESC)` | RLS enabled; SELECT and UPDATE policies compare employee ID to `auth.jwt().app_metadata.employee_id`; no INSERT policy visible |

#### Archive

| Table | Purpose and columns visible in repository | Relationships / foreign keys | Indexes in tracked SQL | RLS / policies in tracked SQL |
|---|---|---|---|---|
| `archive_documents` | Document registry: `id`, `document_number`, `document_name`, `document_type`, `classification`, `employee_id`, `file_url`, `file_type`, `source_entity`, `destination_entity`, `external_reference`, `document_date`, `status`, `uploaded_by`, `created_at` | `employee_id → employees(id) ON DELETE SET NULL`; `uploaded_by → auth.users(id) ON DELETE CASCADE` | Unique `document_number`, unique `file_url`; `(uploaded_by,created_at DESC)`, `(document_type,created_at DESC)`, `(employee_id,created_at DESC)` | RLS enabled: owner or `admin_manager`/`it_manager` SELECT; authenticated uploader INSERT own; managers UPDATE; owner may DELETE own pending documents, managers may DELETE any |
| `archive_document_counters` | Number generator state: `document_type`, `document_year`, `last_sequence` | None | Composite PK `(document_type,document_year)` | RLS enabled, no policies visible; RPC is `SECURITY DEFINER`, execution revoked from public/anon/authenticated and granted to `service_role` |

#### Strategic projects and investment

| Table | Purpose and columns visible in repository | Relationships / foreign keys | Indexes in tracked SQL | RLS / policies in tracked SQL |
|---|---|---|---|---|
| `development_projects` | Portfolio: `id`, `project_code`, `project_name`, `sector`, `municipality`, `location_details`, `area_size`, `estimated_budget`, `funding_source`, `priority_level`, `status`, `required_intervention`, `description`, `created_at`, `is_verified`, `verified_by`, `verified_at`, `completion_percentage`, `start_date`, `end_date`, `contractor_name` | `verified_by → auth.users(id) ON DELETE SET NULL` | Unique `project_code`; indexes on `sector`, `municipality`, `(status,priority_level)`, `created_at DESC`, `is_verified` | RLS enabled, no policies visible |
| `project_attachments` | Project file metadata: `id`, `project_id`, `file_url`, `file_name`, `attachment_type`, `created_at` | `project_id → development_projects(id) ON DELETE CASCADE` | `(project_id)` | RLS enabled, no policies visible |
| `project_code_counters` | Annual project number sequence: `code_year`, `last_sequence` | None | PK `code_year` | RLS enabled, no policies visible; code generator is `SECURITY DEFINER`, execution limited to service role |
| `project_tracking` | Field progress history: `id`, `project_id`, `update_date`, `completion_percentage`, `contractor_name`, `delay_reasons`, `field_photos_url`, `created_at` | `project_id → development_projects(id) ON DELETE CASCADE` | `(project_id,update_date DESC)` | RLS enabled, no policies visible; insert trigger syncs newest completion to project |
| `project_financials` | Financial snapshots: `id`, `project_id`, `approved_budget`, `contract_value`, `amount_spent`, `financial_obligations`, `created_at` | `project_id → development_projects(id) ON DELETE CASCADE` | `(project_id)` | RLS enabled, no policies visible |
| `agricultural_lands` | Land inventory: `id`, `land_name`, `area_size`, `municipality`, `soil_type`, `water_source`, `status`, `is_available_for_investment`, `created_at` | None | `(municipality)` | RLS enabled, no policies visible |
| `mineral_resources` | Mineral/natural-resource catalog: `id`, `resource_name`, `location`, `coordinates`, `area_size`, `exploration_status`, `classification`, `created_at` | None | None visible | RLS enabled, no policies visible; classification includes `سري` |
| `investment_opportunities` | Investment listing: `id`, `title`, `sector`, `description`, `estimated_cost`, `target_investor`, `status`, `created_at` | None | None visible | RLS enabled, no policies visible |
| `investment_applications` | Applicant interest: `id`, `opportunity_id`, `applicant_id`, `applicant_name`, `applicant_email`, `note`, `status`, `created_at` | `opportunity_id → investment_opportunities(id) ON DELETE CASCADE`; `applicant_id → auth.users(id) ON DELETE SET NULL` | No secondary index visible | RLS enabled, no policies visible |
| `development_sectors_projects` | Separate health/education/infrastructure project list: `id`, `project_name`, `sector_type`, `location`, `budget`, `status`, `completion_percentage`, `created_at` | None | `(sector_type,created_at DESC)` | RLS enabled, no policies visible |
| `field_visits` | Site visit notes: `id`, `visit_date`, `location`, `purpose`, `findings`, `visitor_name`, `created_at` | None | `(visit_date DESC)` | RLS enabled, no policies visible |

**Additional database objects:** Trigger function `sync_project_completion_from_tracking()` updates `development_projects` after a tracking insert if that update is newest. RPCs `next_development_project_code(year)` and `next_archive_document_number(type,year)` generate identifiers. Four private buckets and the avatar bucket are described in Storage Architecture.

### ERD-style relationship explanation

```text
auth.users ──1:1?── profiles
    ├──1:N── audit_logs.actor_id
    ├──1:N── archive_documents.uploaded_by
    ├──1:N── investment_applications.applicant_id
    └──1:N── development_projects.verified_by

departments ──parent_id──> departments (self hierarchy)
departments ──manager_id──> employees
employees ──department_id──> departments
employees ──direct_manager_id──> employees (self hierarchy)
employees ├──1:N── leaves, permissions, decisions, penalties, trainings,
          │         evaluations, clearances, assets, documents, notifications
          └──1:N── archive_documents.employee_id (nullable)

development_projects ├──1:N── project_attachments
                     ├──1:N── project_tracking
                     └──1:N── project_financials
investment_opportunities ──1:N── investment_applications

development_sectors_projects, field_visits, agricultural_lands,
mineral_resources, module_access, system_settings, and number counters
have no additional domain relationships in tracked DDL.
```

The `profiles`/`auth.users` relationship and base employee/leave/attendance constraints must be verified against the actual Supabase catalog before relying on this ERD as a migration plan.

## 6. Authentication & Authorization

### Login flow

- Platform login is Supabase Auth email/password from `/login`.
- Most server-side protected operations call `getAuthenticatedActor()`, which validates the Supabase user using `auth.getUser()` and loads `profiles.full_name,role`.
- HR/archive module login requires an existing platform session, normalizes username, checks input shape, fetches `module_access`, and compares the password with bcrypt.
- On success it issues a signed token with `employeeId`, module name, and expiry, stored in a secure-in-production HttpOnly cookie for eight hours.
- Logout removes module cookies; platform logout signs out Supabase and clears both module cookies.

### Roles

Observed role names: `president`, `vice_president`, `admin_manager`, `it_manager`, and `employee`. The `profiles.role` database constraint/enum is not defined in tracked SQL.

- Project access: president, vice-president, admin manager, IT manager.
- Project verification: admin manager and IT manager.
- Admin/settings/users/reports/backup: admin manager and IT manager.
- Organization edits: admin manager and IT manager.
- HR module data/actions: generally any valid HR module token; platform role is sometimes loaded for display but not consistently enforced in actions.
- Archive managers: admin manager and IT manager; archive staff can access documents allowed by ownership logic.

### User management

- Admin managers/IT managers can create Supabase users and profiles, list users, update roles, ban/unban, and delete accounts.
- Account creation includes compensating deletion if profile insertion fails.
- A fixed allowlist prevents some role values, but allowlists are inconsistent: creation permits `vice_president` but not `it_manager`; role update permits `it_manager` but not `vice_president`.

### Security model and key concerns

- Supabase Auth is the platform identity provider. `profiles.role` supplies application RBAC.
- RLS plus action-level checks should provide defense in depth. In practice, service-role client calls bypass RLS; correctness depends on each action checking actor identity/role and constraining row ownership.
- Middleware checks the existence of a cookie whose name starts with a hardcoded Supabase project-specific prefix; it does not validate the Supabase session itself. Server actions/pages must independently verify the user.
- The signed HR/archive token is not bound to a Supabase user ID and is not revalidated against `module_access.is_active` after issuance. Most HR actions check only its employee claim. Disabling a module account may therefore not revoke an already issued token immediately.
- There is no module-login rate-limiting/lockout code in the Server Action.
- Role checks are string-based and duplicated across modules; no central permission matrix/policy helper is used.
- RLS on many feature tables has no visible policies. This can break direct authenticated access and increases the impact of any service-role action missing its own checks.
- Profiles, employees, leaves, attendance, and promotions policy coverage cannot be assessed from tracked migrations.
- The tracked root-level `/promotions` page checks for a signed-in user in browser code but does not enforce a server-side role; it performs direct browser-side table writes and depends on production RLS.

## 7. Existing Modules

Completion percentages are estimates based on visible UI + data/action implementation breadth, not acceptance testing. They do not measure production security or reliability.

| Module | Purpose and implemented features | Main missing features / caveats | Estimate |
|---|---|---|---:|
| Platform dashboard / systems portal | User/profile greeting, role-filtered project-system card, HR/archive system links, logout | No organization-wide operational analytics or centralized authorization model | 65% |
| Employee master data | Employee profile table, search/filter, profile editing, photo upload, import, employee card/printing, summary KPIs | Monolithic page; data access uses service-role action; scoped roles and field-level privacy not consistently established | 70% |
| Organization structure | Departments, hierarchy, manager assignment, employee mapping; cycle checks before department edits | No change history/approval workflow; validation gaps around referenced IDs/cross-record invariants | 65% |
| Attendance | Check-in/check-out, late minutes, daily/local Tripoli time window, historical list | History query returns all employees/all periods; no shifts, correction approvals, device integration, scoped manager report | 55% |
| Leave and permission requests | Requests, types/annual caps, direct-manager pending approvals, notes/status, balances, notifications | No demonstrated accrual engine, holiday calendar, overlap/concurrency handling, full audit trail, or multi-stage approvals | 65% |
| HR decisions | Decision record listing and print view | No demonstrated approval/signature workflow, numbering controls, or document lifecycle | 55% |
| Promotions | Eligibility helper and HR promotions UI; separate legacy direct-Supabase promotions route | Duplicate implementations/routes; root route excluded from TS checking and lacks server-side role enforcement; schema/migration missing | 40% |
| Delegations | Employee assignment/delegation records and UI | Limited workflow/period overlap and approval evidence | 50% |
| Assets/custody | Assignments, inventory and return-status UI; exit clearance checks for assigned assets | HR actions operate broadly with service role; no serial-number uniqueness/stock ledger or full transfer workflow | 60% |
| Employee documents/archive | Employee document upload, private bucket and signed download URLs | Scope is not tied to caller’s employee ID; no retention/virus scan/versioning or policy evidence | 55% |
| Clearance | Termination/resignation clearance, outstanding asset block, printable certificate | No all-department sign-off workflow or immutable certification/audit process | 60% |
| Penalties / evaluations / trainings / correspondence | CRUD-oriented HR records, searchable/list-oriented pages, training certificates | Role scoping, approvals, retention, and audit consistency are incomplete/not evidenced | 55% |
| Central archive | Document metadata/classification, numbering, multi-upload, signed transfers/downloads, review status, manager access | No retention/legal hold/OCR/virus scanning; classification compartments and download audit not established | 70% |
| Notifications | Per-employee list, read/unread, mark-all, periodic refresh, direct manager/report notification rule | Polling only; no delivery guarantees, realtime/push/email, retry queue, template management | 60% |
| Projects command center | Project create/list/filter, verified-project KPIs, status/budget charts, urgent/latest lists, verification | Full-table scans, no versioned approvals, project/RBAC workflow and financial ledger controls incomplete | 75% |
| Project tracking / field visits | Progress, contractor, delay reasons, field photo upload; field visit records | No GIS-linked field workflow, supervisor approval, offline capture, robust time-series analytics | 60% |
| Project finance | Project financial snapshots and budget/commitment figures | No transaction ledger, approvals, reconciliation, procurement/payment integration, or finance-specific role separation | 50% |
| Lands / minerals / investment | Inventory and opportunity/application models and screens | No demonstrated investment lifecycle, due diligence, GIS coordinates normalization, external applicant portal | 50% |
| GIS | Coordinate list and placeholder map panel | Map is explicitly temporary; no GIS provider, actual layers or spatial database types | 20% |
| Urban / health / education sectors | Sector-specific project workspaces and status/finance fields | Separate sector table creates potential duplicate portfolio model; no complete workflows visible | 45% |
| Administrative users / settings | User provisioning, roles, ban/delete, system identity, module credentials | Role lifecycle inconsistencies; no MFA/provisioning approval/SCIM/centralized policy; no settings version history | 65% |
| Reports | HR headcount, attendance and leave status charts; project reports/dashboard | Aggregation is computed in application over unbounded datasets; no scheduled exports or reporting warehouse | 50% |
| Audit logs | Records add/update/delete actions; admin log viewing/search/date filters | Not all actions consistently audited; IP address exists but capture not established; no tamper-evident storage | 50% |
| Backup | Admin JSON export for employees, leaves, attendance, archive metadata | No restore, encrypted offsite copies, schedules, integrity checks, retention, or disaster-recovery test | 25% |

## 8. Existing Pages

All `/dashboard/**` routes are behind the middleware’s platform-cookie-presence gate. Some module routes validate their secondary cookie in middleware; `/dashboard/archive` validates it in its server page instead. Server authorization and actual data access remain route/action-specific.

### Public and client-auth-gated routes

| Route | Purpose |
|---|---|
| `/` | Government platform landing page |
| `/login` | Primary Supabase email/password login |
| `/archive/login` | Archive secondary login UI; middleware requires platform session before reaching it |
| `/hr/login` | HR secondary login UI; middleware requires platform session before reaching it |
| `/promotions` | Legacy root-level promotions management screen; the page performs a browser-side Auth check and relies on database RLS for direct writes, with no server-side role gate |

### Protected employee, archive, project, and general pages

| Route | Purpose |
|---|---|
| `/dashboard` | Systems portal |
| `/dashboard/employees` | HR master directory and overview |
| `/dashboard/employees/archive` | Employee document archive |
| `/dashboard/employees/assets` | Employee assets |
| `/dashboard/employees/attendance` | HR attendance screen |
| `/dashboard/employees/clearances` | Exit clearances |
| `/dashboard/employees/clearances/[id]/print` | Printable clearance |
| `/dashboard/employees/correspondences` | Correspondence records |
| `/dashboard/employees/custody` | Custody/asset management view |
| `/dashboard/employees/decisions` | HR decisions |
| `/dashboard/employees/decisions/[id]/print` | Printable HR decision |
| `/dashboard/employees/delegations` | Delegation/assignment records |
| `/dashboard/employees/evaluations` | Employee evaluations |
| `/dashboard/employees/penalties` | Disciplinary records |
| `/dashboard/employees/promotions` | Employee promotions |
| `/dashboard/employees/reports` | HR reports and promotion eligibility |
| `/dashboard/employees/trainings` | Training records |
| `/dashboard/attendance` | Separate attendance route (overlaps conceptually with employee attendance route) |
| `/dashboard/leaves` | Leave and permission workflow |
| `/dashboard/archive` | Current archive workspace |
| `/archive/dashboard` | Alternate/legacy archive dashboard route |
| `/dashboard/projects` | Strategic project command center |
| `/dashboard/projects/database` | Dynamic legacy path redirects to `/dashboard/projects` |
| `/dashboard/projects/[module]` | Dynamic legacy module handler; unknown module returns 404 |
| `/dashboard/projects/finance` | Project finance |
| `/dashboard/projects/gis` | GIS placeholder/coordinate view |
| `/dashboard/projects/health-education` | Health and education projects |
| `/dashboard/projects/investments` | Investment opportunities/applications |
| `/dashboard/projects/lands` | Agricultural land inventory |
| `/dashboard/projects/minerals` | Mineral/natural resources |
| `/dashboard/projects/tracking` | Project progress tracking |
| `/dashboard/projects/urban` | Urban development/infrastructure |
| `/dashboard/projects/visits` | Field visits |
| `/dashboard/reports` | Administrative reports |

### Admin pages

| Route | Purpose |
|---|---|
| `/dashboard/users` | User directory, role/banned-state management |
| `/dashboard/settings` | System identity and contact settings |
| `/dashboard/settings/modules` | HR/archive module-account provisioning |
| `/dashboard/audit-logs` | Audit history |
| `/dashboard/backup` | JSON export interface |

**Route-level caveat:** Several checks exist in pages and actions, but middleware primarily verifies cookie presence/signature. Always validate authorization in Server Actions and server data loaders, not just navigation visibility.

## 9. API Analysis

### HTTP API routes

- **Next.js Route Handlers:** None found (`app/api`/`route.ts` count: 0).
- **Supabase Edge Functions:** None found under `supabase/functions`.
- **Supabase RPC/database functions:** Three SQL functions are tracked:
  - `next_development_project_code(p_year)` — concurrency-safe annual project-number counter, granted to service role.
  - `next_archive_document_number(p_document_type,p_document_year)` — archive number counter; validated type/year and restricted to service role.
  - `sync_project_completion_from_tracking()` — trigger function to copy the newest tracking percentage/contractor to its project.

### Server Actions

The app has 28 `'use server'` files spanning:

- **Platform/admin:** create/delete/list/manage users, logout, settings, audit logs, administrative reports, backup export, logging, module login, notifications.
- **HR:** employee dashboard data; attendance; leaves and permissions; organization; assets; documents; clearances; decisions; delegations; penalties/evaluations/training/correspondence; HR reports.
- **Archive:** upload-ticket generation, upload completion, document search, review/update/delete/download, archive department lookup.
- **Projects:** project create/list/stats/verification plus field tracking, finance, lands, minerals, opportunities/applications, sector projects, and visits.

Actions generally return typed success/error objects, but not every action has the same authorization or audit guarantees. The most sensitive actions should be inventoried and checked against a centralized authorization matrix.

## 10. Components Analysis

| Component / group | Purpose | Usage / dependencies |
|---|---|---|
| `components/auth/ModuleLoginForm.tsx` | Shared username/password login for HR and archive | Calls module Server Action; Next router; Lucide |
| `components/layout/Sidebar.tsx` | Responsive dashboard navigation, role-area links, logout, active route styling | `usePathname`, Next Link, logout Server Action, Lucide |
| `components/layout/NotificationBell.tsx` | Notification dropdown, polling, read/mark-all actions | Notification Server Actions, Next router, Lucide |
| `app/dashboard/projects/projects-command-center.tsx` | Project command center: KPIs, charts, filtering, forms, project list | Recharts; project actions; Tailwind; Lucide |
| `app/dashboard/projects/sector-projects-workspace.tsx` | Shared sector project management UI | Project strategy actions and typed domain records |
| `app/dashboard/projects/tracking/tracking-workspace.tsx` | Progress tracking UI and photo upload | Strategic actions, `FormData`, project rows |
| `app/dashboard/projects/finance/finance-view.tsx` | Finance dashboard view | Strategic finance action data |
| `app/dashboard/projects/lands/lands-workspace.tsx` | Agricultural lands workspace | Strategic actions; filter and form state |
| `app/dashboard/projects/investments/investments-workspace.tsx` | Investment opportunities and applications | Strategic actions |
| `app/dashboard/archive/archive-client.tsx` | Archive search/upload/review/download interface | Archive Server Actions, signed URLs |
| `app/dashboard/employees/decisions/decisions-client.tsx` | Decision list and print workflow | Decision actions, print helpers |
| `app/dashboard/employees/organization/organization-client.tsx` | Organization chart/list editing | Organization Server Actions |
| `app/dashboard/reports/reports-client.tsx` | Administrative chart/report UI | `recharts`; report DTOs |
| `app/dashboard/users/users-client.tsx` | User creation, role assignment, status actions | User Server Actions |
| `app/dashboard/settings/settings-form.tsx` | System settings editor | Settings Server Action |
| `app/dashboard/settings/modules/modules-client.tsx` | HR/archive account management | Module access Server Actions |
| `app/dashboard/backup/backup-client.tsx` | Download/admin backup interface | Backup export action |
| `app/dashboard/audit-logs/audit-logs-client.tsx` | Audit filtering and display | Audit-log action |
| `app/archive/dashboard/archive-dashboard.tsx` | Older archive dashboard implementation | Separate legacy route; review overlap with current archive workspace |

Most module-specific screens are page-local rather than reusable component packages. Form validation, access patterns, action result shapes, and error handling differ across modules.

## 11. Security Assessment

This is a repository-level risk assessment, not a penetration test. Severity reflects likely impact if production uses the visible code and no stronger external controls exist.

### High priority

1. **HR module token grants overly broad service-role data access.** `getHrEmployeeId()` proves only that a valid HR token exists. Multiple HR actions then use the service-role client and fetch or mutate cross-employee records, without consistently checking platform role or limiting operations to the token’s employee/manager scope. Examples include the employee dashboard, attendance history, assets, clearances, employee documents, and HR record actions. This exposes highly sensitive fields such as national IDs, salaries, sanctions, training, and attendance to every account issued an HR module token.  
   Evidence: `app/dashboard/employees/actions.ts`, `app/dashboard/employees/attendance/actions.ts`, `app/dashboard/employees/assets/actions.ts`, `app/dashboard/employees/archive/actions.ts`, `app/dashboard/employees/clearances/actions.ts`, `app/dashboard/employees/hr-records/actions.ts`.

2. **Tracked environment-like file is not protected by the ignore rule.** `sda-platform/.enf.local` is tracked, 151 bytes, and does not match `.env*` in `.gitignore`. Its contents were deliberately not inspected or reproduced. If it contains credentials, it is already in Git history and should be treated as potentially disclosed: inspect privately, rotate any secrets, remove it from tracked history as appropriate, and correct ignore/secret-scanning controls. This audit cannot assert that it contains a secret.

3. **Legacy `/promotions` is a direct browser-side write path without server-side RBAC.** It checks `auth.getUser()` in the client and then directly selects/inserts into `promotions` and updates employee grade. There is no role check in this route; its safety depends entirely on database RLS. The table and its policies are absent from tracked migrations, and `promotions/` is excluded from the TypeScript project. Treat as high risk until live policies and access tests are verified.

### Medium priority

4. **RLS policy coverage is incomplete in tracked schema.** Many tables enable RLS but define no policies (`assets`, `documents`, `permissions`, `penalties`, `trainings`, `evaluations`, `clearances`, `correspondences`, project tables, settings, module access, and others). This may intentionally fail closed for browser/anon calls, but it provides no demonstrated database-level role/row model and the application frequently bypasses RLS with service role. Verify the live catalog and add explicit least-privilege policies.

5. **Module token revocation and session binding are weak.** HR/archive JWT-like tokens carry employee ID/module/expiry but are not tied to a platform user ID. `is_active` is checked at login only; existing tokens remain valid until their eight-hour expiry. Many HR actions check the module cookie alone and do not call `getAuthenticatedActor()`, so primary-session expiry does not necessarily invalidate Server Action access.

6. **No visible throttling for module username/password login.** Passwords are bcrypt-hashed, but no per-account/IP rate limit, lockout, or suspicious-login monitoring is implemented in the action layer.

7. **Upload validation relies partly on client MIME metadata.** File type is checked using `File.type`, but the repository does not show content/magic-byte validation, malware scanning, or quarantine. This matters for government document storage.

8. **Role allowlists are inconsistent.** User creation and role updates accept different role sets; roles are free-form text in the visible model. This risks accidental privilege lifecycle errors and hard-to-audit behavior.

9. **Public-key configuration is hardcoded as a fallback.** The Supabase URL and publishable/anon key fallback in `utils/supabase/config.ts` are client-visible values by design, not service secrets. They should still be managed consistently per environment, and production security must rely on correct RLS. No service-role key literal was found in the inspected source; service role is read from server environment.

10. **Archive classification has no demonstrated policy compartment.** `classification` includes `secret`, but visible document policies allow owners and archive managers; no separate classification-aware access policy or download audit is defined.

### Positive controls observed

- Service-role key is accessed server-side and module signing cookies are HttpOnly, Secure in production, and SameSite Strict.
- Module passwords use bcrypt (cost 12).
- The archive and project identifier RPCs validate inputs and restrict execution to `service_role`.
- Archive access has owner/manager policies, signed downloads, MIME/size limits, and signed upload-ticket integrity checks.
- Many user-facing Server Actions validate role, value bounds, and UUID shape.
- Supabase `auth.getUser()` is used for actor verification rather than trusting client-provided user IDs in admin actions.

## 12. Performance Assessment

### Main risks

- **Unbounded employee datasets:** `getEmployeesDashboardData()` loads all employee rows (including sensitive/high-cardinality fields) and computes dashboard totals in application memory.
- **Attendance full-history query:** `getAttendanceDashboardData()` loads attendance for all employees across all time, then resolves names in batches. This is both a privacy and scaling concern; the dashboard needs date/employee scoping and server-side pagination/aggregation.
- **Project portfolio scans:** `getProjects()` iterates all pages into a single in-memory array. `getProjectsStats()` scans all verified projects and aggregates in JavaScript on each request. The command center loads both concurrently.
- **Admin reports and backup:** reports fetch entire employee/leave sets and attendance windows into memory; backup materializes every row of four tables and returns one large response. No incremental export or streaming path is shown.
- **Archive signing:** signed-URL generation over lists can become expensive if every document is signed per request. Review query pagination and ensure URL generation is limited to displayed results.
- **Potentially large client bundles:** `xlsx`, jsPDF, and charting dependencies can materially increase client bundles if not dynamically imported; no bundle analyzer or size budget is configured.
- **Oversized components:** observed largest files include `server-auth.ts` (~1,118 lines), employee page (~991), projects command center (~709), archive actions (~592), archive client (~511), HR-record actions (~447), strategic actions (~423), and leaves page/actions (~397/~385). This increases coupling and review difficulty.
- **Index coverage is incomplete:** several visible hot filters have no corresponding index in tracked SQL (for example status-only asset scans, investment-opportunity status, and multiple leave/attendance lookups). Actual base-table indexes are unknown. Composite indexes should follow measured query plans, not be added blindly.
- **Upload body limit mismatch:** Next Server Actions are capped at 6 MB, while employee document/training buckets/actions allow files up to 15 MB. Files larger than the Server Action transport limit may fail before application validation. Archive uses signed direct upload, avoiding that specific path.
- **External font dependency:** Cairo is imported from Google Fonts in CSS, adding a third-party runtime dependency and potential font-loading latency/availability issue.

No production traces, query plans, real row counts, Core Web Vitals, or bundle reports were available; these are code-path risks, not measured latency findings.

## 13. Missing Enterprise Features

### High priority

- Central permission matrix with server-side role + row/department/record scope enforcement for every action.
- Live Supabase schema/RLS audit and least-privilege policies for all public tables and Storage objects.
- Complete/reproducible database migration history, including base schema and role constraints.
- MFA/step-up authentication for privileged roles and sensitive actions.
- Session revocation and secondary-token binding/revocation on primary sign-out, account disable, role change, and employee departure.
- Security event monitoring, login throttling, credential lockout, and alerting.
- HR privacy controls: field-level minimization, employee self-service vs HR-admin views, restricted salary/national-ID access, and auditable exports.
- Automated backup schedule, encrypted offsite storage, restore drills, and retention policy.
- Automated tests: authorization tests, RLS policy tests, Server Action validation tests, migrations tests, and key workflow integration tests.
- Credential hygiene: audit/remove the tracked `.enf.local` if it contains secrets, rotate credentials as needed, and add repository secret scanning.

### Medium priority

- Central audit middleware/helper that records actor, action, entity, before/after, request ID, and timestamp for all data mutations.
- Approval workflows and electronic signature/immutable decision history for procurement, HR decisions, project verification, and financial changes.
- Data lifecycle, record retention, legal hold, archival exports, and privacy/compliance policy.
- File malware scanning, content validation, object-level access policies, lifecycle policies, and download auditing.
- Pagination/search/server-side aggregates for large tables and export streaming.
- Operational observability: structured logs, error tracking, metrics, tracing, uptime probes, SLOs, alerting.
- CI/CD with lint/type/test/build gates, dependency and secret scanning, deployment previews, and rollback.
- Formal API/action versioning and OpenAPI or equivalent service contract documentation.
- Disaster recovery, environment promotion, change approval, and deployment runbooks.
- GIS provider integration with typed spatial data, coordinate validation, layers, and map permissions.
- Accessibility and browser/device testing across public-sector requirements.

### Low priority

- Realtime/push/email notification delivery and notification templates.
- Internationalization beyond Arabic/RTL and localized date/currency preferences.
- Design system/component library and shared form/table primitives.
- Report scheduling, saved filters, configurable dashboards, and analytics warehouse.
- Workflow automation, configurable forms, and business-rule administration.
- User provisioning integrations (directory/SSO/SCIM) and organization-wide identity federation.

## 14. Technical Debt

- **Duplicated/legacy flows:** `/promotions` and `/dashboard/employees/promotions`; `/archive/dashboard` and `/dashboard/archive`; `/dashboard/attendance` and `/dashboard/employees/attendance`.
- **TypeScript gap:** `tsconfig.json` excludes `promotions`, despite that directory being part of the Next app and using untyped callback parameters/state. The route may be built by Next but is not part of normal TS project checking.
- **Incomplete schema source of truth:** handwritten `AdminDatabase` is long, partly non-generated, has `Relationships: []`, and is not tied to the migration chain. It can drift from Supabase.
- **Migration hygiene:** only two migration names use Supabase timestamp naming; most SQL files have descriptive names without timestamps. Base schema is absent, application of the full history/order is not self-evident, and there is no checked-in Supabase project config or migration verification pipeline.
- **Root/app manifest split:** root package contains only Supabase dependencies and no scripts while `sda-platform` is the true app. This complicates onboarding, automation, and Vercel root-directory clarity.
- **Role logic duplication:** role arrays, action checks, and user-management allowlists are hard-coded across files and diverge.
- **Large mixed-responsibility files:** HR directory page and project command center mix data orchestration, forms, validation, charts, and display; `server-auth.ts` combines generated-like database types and auth helpers.
- **Inconsistent data access:** browser Supabase access, server actions with anon context, and service-role actions coexist. This makes the effective access boundary difficult to reason about.
- **Error/empty behavior differs:** some data actions return empty arrays on failure, while others return errors or log-only fallbacks; users may see success-shaped empty data.
- **Weakly constrained domain text:** multiple statuses/classifications are unrestricted `text` columns; enum/check constraints are inconsistent across entities.
- **No test files found among 148 tracked files.**
- **README is generic scaffolding**, not project setup/architecture documentation.
- **Environment filename typo:** tracked `.enf.local` is likely accidental and not matched by `.env*` ignore rules.
- **Possible schema drift:** `/promotions` queries a `promotions` table absent from migrations and typed database.

## 15. Production Readiness

| Area | Score / 10 | Rationale |
|---|---:|---|
| Security | **3** | Strong primitives exist, but broad service-role HR operations, incomplete visible RLS policies, legacy browser writes, unverified tracked env-like file, and inconsistent authorization prevent enterprise approval |
| Performance | **5** | Functional querying and some indexes/pagination exist, but important dashboards scan unbounded datasets and aggregate in memory |
| Maintainability | **4** | TypeScript and modular routes help; large components, duplicated flows, handwritten schema, inconsistent role checks, missing tests/docs lower confidence |
| Scalability | **4** | App can serve pilot-scale use; no evidence of capacity planning, database-side aggregations, caching, background jobs, or workflow separation |
| Reliability | **4** | Build works and many actions surface errors, but no tests, restore drills, observability/SLOs, CI gates, or verified production deployment |

**Overall readiness:** Not yet suitable for a high-assurance sovereign/government production environment without security remediation, schema verification, test coverage, and operational controls. It may be suitable for a controlled pilot after live RLS and service-role paths are reviewed.

## 16. Recommended Roadmap

### Phase 1 — Contain security and establish trusted schema (highest urgency)

1. Privately inspect tracked `.enf.local`; if it contains any credential, rotate it immediately and remove it from repository history according to incident procedure.
2. Export the live Supabase catalog and policies; reconcile it against all 17 SQL files and the handwritten database type.
3. Build a central authorization matrix. For every Server Action, assert platform actor, role, module token, employee/manager scope, and object ownership as applicable.
4. Restrict HR actions by role and data scope; remove global employee/attendance reads from regular HR-module accounts.
5. Bind module sessions to platform user and employee, re-check active module account/role or provide revocation, and invalidate tokens when platform session ends.
6. Review `/promotions` and either retire it or migrate it to the protected action pattern; stop excluding production routes from TypeScript checks.
7. Add explicit RLS and Storage policies for all tables/buckets, with cross-role negative tests. Treat service role as privileged infrastructure and minimize its usage.
8. Rotate any credentials confirmed exposed; enable secret scanning and safe environment-file rules.

### Phase 2 — Schema, data integrity, and workflow correctness

1. Create a versioned, ordered migration baseline for profiles, employees, leaves, attendance, promotions, and all referenced tables.
2. Generate Supabase types from the authoritative schema; remove hand-maintained relationship-free duplication.
3. Normalize status/role constraints, add required foreign keys/unique constraints and transaction-safe business invariants.
4. Resolve duplicate routes and duplicated promotion/attendance/archive flows.
5. Move important approval and audit requirements into database transactions or well-defined service operations.
6. Reconcile the 6 MB Server Action limit with 15 MB document upload flows.

### Phase 3 — Test, performance, and quality gates

1. Add unit tests for validators, role matrix, time-zone calculations, promotion eligibility, and business rules.
2. Add integration tests for Auth + Server Actions + RLS, including unauthorized user/employee/department cases.
3. Add end-to-end tests for login, HR module, leave approvals, project verification, archive upload/download, and backup.
4. Paginate data views; add server-side aggregation and date/department filters for attendance/reports; stream large exports.
5. Use measured `EXPLAIN ANALYZE` queries to create indexes; introduce performance budgets and bundle analysis.
6. Implement CI for format/lint/type/test/build, dependency audits, secret scanning, and migration validation.

### Phase 4 — Enterprise operations and governance

1. Add MFA/SSO integration, provisioning lifecycle, privileged-action step-up, and account-revocation procedures.
2. Add observability, incident response, immutable audit export, alerting, and uptime/SLO reporting.
3. Automate encrypted offsite backups and perform documented restoration and disaster-recovery exercises.
4. Implement retention/legal hold, malware scanning, document classification controls, and access/download audits.
5. Add GIS integration, production workflow approvals, finance/procurement integrations, and signed government records.
6. Complete accessibility, Arabic localization, load, browser, and security acceptance testing; formally gate production releases.

## 17. Final Conclusions

- **Overall architecture score:** **4.2/10** for enterprise readiness; the product architecture is a coherent Next.js/Supabase MVP, but its high-privilege access model and operational evidence are not mature enough for a sovereign production system.
- **Estimated maturity level:** Functional MVP / controlled pilot, not production-certified enterprise.
- **Biggest strengths:**
  - Broad, useful domain coverage across HR, projects, archive, and administration.
  - Modern TypeScript/Next.js/Supabase stack with Arabic RTL UI.
  - Explicit input checks and role checks in many server actions.
  - Bcrypt module passwords, signed HttpOnly module cookies, private Storage buckets, signed file URLs, and some database constraints/indexes.
  - Production build is configured and most recently observed build completed successfully.
- **Biggest weaknesses:**
  - HR service-role actions do not consistently enforce platform roles or row-level scope.
  - Database foundation and live RLS catalog are not reproducible from tracked migrations.
  - No automated tests are tracked.
  - Several unbounded full-table reads and a large in-memory backup path.
  - Legacy duplicate routes and a public-client promotion write path.
  - A tracked, unignored env-like file needs private credential review.
  - No demonstrated CI, observability, restore process, or confirmed active production deployment.
- **Immediate next actions:**
  1. Inspect `.enf.local` privately and rotate secrets if present.
  2. Export/verify Supabase schema and RLS policies, then lock down all service-role HR actions.
  3. Protect or retire the legacy `/promotions` route and reconcile duplicate routes.
  4. Add authorization/RLS regression tests before further feature development.
  5. Replace unbounded attendance/employee/project scans with scoped pagination and server-side aggregates.
  6. Establish canonical, ordered migrations and generated database types; validate deployment and backups.

---

### Audit references

- Application dependencies/configuration: `sda-platform/package.json`, `sda-platform/next.config.ts`, `sda-platform/tsconfig.json`
- Auth and service-role boundary: `sda-platform/app/actions/server-auth.ts`, `sda-platform/middleware.ts`, `sda-platform/app/archive/module-auth.ts`
- HR data access examples: `sda-platform/app/dashboard/employees/actions.ts`, `sda-platform/app/dashboard/employees/attendance/actions.ts`, `sda-platform/app/dashboard/employees/assets/actions.ts`
- Legacy direct browser writes: `sda-platform/promotions/page.tsx`
- Database DDL: `sda-platform/supabase/migrations/*.sql`
- Environment ignore mismatch: `sda-platform/.enf.local`, `sda-platform/.gitignore`
