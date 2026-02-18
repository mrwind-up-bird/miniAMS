# miniAMS

A multi-tenant agency management SaaS for small software agencies. CRM, project management, time tracking, and invoicing — all in one clean, mobile-first application.

**Live:** [Vercel Deployment](https://vercel.com/oliver-baers-projects/mini-ams)

---

## Features

- **Multi-Tenant Architecture** — Complete data isolation per company
- **CRM** — Customers, contacts, status tracking, tags
- **Projects** — Team management, budgets, hourly rates, customer linking
- **Time Tracking** — Start/stop timer, manual entries, weekly grid view, approval workflow
- **Invoicing** — Atomic invoice numbering (RE-YYYY-NNNN), time entry import, status workflow, KPI dashboard
- **Settings** — Profile, company info, team management with role-based access
- **i18n** — German and English from day one
- **Mobile First** — Bottom navigation, card layouts, touch-optimized

---

## Architecture Overview

```mermaid
graph TB
    subgraph Client["Browser"]
        UI[React Server & Client Components]
        RDR[App Router - Locale Routing]
    end

    subgraph Middleware["Edge Middleware"]
        AUTH_MW[Auth Check]
        I18N_MW[Locale Detection]
    end

    subgraph Server["Next.js Server"]
        SA[Server Actions]
        API[API Routes - Auth Only]
        AUTH[NextAuth v5 - JWT Sessions]
    end

    subgraph Data["Data Layer"]
        PRISMA[Prisma ORM]
        TENANT[Tenant Isolation Layer]
        PG[(PostgreSQL)]
    end

    UI --> RDR
    RDR --> AUTH_MW
    AUTH_MW --> I18N_MW
    I18N_MW --> SA
    I18N_MW --> API
    SA --> AUTH
    API --> AUTH
    AUTH --> PRISMA
    PRISMA --> TENANT
    TENANT --> PG
```

---

## Multi-Tenant Data Flow

Every request is scoped to a tenant. The JWT session carries the `tenantId`, and every database query includes it as a mandatory filter.

```mermaid
sequenceDiagram
    participant B as Browser
    participant MW as Middleware
    participant SA as Server Action
    participant DB as PostgreSQL

    B->>MW: Request /en/customers
    MW->>MW: Validate JWT session
    MW->>SA: Forward (session attached)
    SA->>SA: requireAuth() → extract tenantId
    SA->>DB: SELECT * FROM Customer WHERE tenantId = ?
    DB-->>SA: Tenant-scoped results
    SA-->>B: Render page with data
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    Tenant ||--o{ User : has
    Tenant ||--o{ Customer : has
    Tenant ||--o{ Project : has
    Tenant ||--o{ TimeEntry : has
    Tenant ||--o{ Invoice : has
    Tenant ||--o{ Service : has
    Tenant ||--o{ InvoiceSequence : has

    Customer ||--o{ Contact : has
    Customer ||--o{ Project : has
    Customer ||--o{ Invoice : has

    Project ||--o{ ProjectMember : has
    Project ||--o{ TimeEntry : has

    User ||--o{ ProjectMember : assigned
    User ||--o{ TimeEntry : tracks

    Invoice ||--o{ InvoiceItem : contains
    InvoiceItem }o--o| TimeEntry : references
    InvoiceItem }o--o| Service : references

    User {
        string id PK
        string tenantId FK
        string email UK
        string name
        enum role
        string locale
    }

    Customer {
        string id PK
        string tenantId FK
        string name
        enum status
        int paymentTermDays
        string currency
    }

    Project {
        string id PK
        string tenantId FK
        string customerId FK
        string name
        enum type
        enum status
        decimal budget
        decimal hourlyRate
    }

    TimeEntry {
        string id PK
        string tenantId FK
        string userId FK
        string projectId FK
        datetime startTime
        int duration
        boolean billable
        enum status
    }

    Invoice {
        string id PK
        string tenantId FK
        string customerId FK
        string number
        enum status
        decimal subtotal
        decimal taxTotal
        decimal total
    }

    Service {
        string id PK
        string tenantId FK
        string name
        decimal unitPrice
        enum unit
        decimal taxRate
    }
```

---

## Invoice Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Invoice
    Draft --> Sent: Mark as Sent
    Draft --> Cancelled: Cancel (owner/admin)
    Sent --> Paid: Mark as Paid
    Sent --> Overdue: Mark Overdue
    Sent --> Cancelled: Cancel (owner/admin)
    Overdue --> Paid: Mark as Paid
    Overdue --> Cancelled: Cancel (owner/admin)
    Paid --> [*]
    Cancelled --> [*]

    note right of Draft
        Fully editable
        Add/remove line items
        Import time entries
    end note

    note right of Sent
        Locked for editing
        Time entries marked "invoiced"
    end note

    note right of Cancelled
        Time entries released
        back to "approved"
    end note
```

---

## Time Entry Workflow

```mermaid
stateDiagram-v2
    [*] --> Draft: Create / Timer Stop
    Draft --> Approved: Approve (owner/admin)
    Approved --> Draft: Unapprove
    Approved --> Invoiced: Import to Invoice
    Invoiced --> Approved: Cancel Invoice
    Invoiced --> [*]
```

---

## Role-Based Access Control

```mermaid
graph LR
    subgraph Roles
        O[Owner]
        A[Admin]
        M[Member]
        V[Viewer]
    end

    subgraph Permissions
        READ[Read all data]
        WRITE[Create & edit records]
        APPROVE[Approve time entries]
        DELETE[Delete records]
        MANAGE[Manage team & roles]
        CANCEL[Cancel invoices]
    end

    O --> READ
    O --> WRITE
    O --> APPROVE
    O --> DELETE
    O --> MANAGE
    O --> CANCEL

    A --> READ
    A --> WRITE
    A --> APPROVE
    A --> DELETE
    A --> CANCEL

    M --> READ
    M --> WRITE

    V --> READ
```

---

## Tech Stack

| Layer        | Technology                              |
|-------------|------------------------------------------|
| Framework   | Next.js 16 (App Router, Turbopack)       |
| Language    | TypeScript 5                             |
| UI          | shadcn/ui + Tailwind CSS v4              |
| Auth        | NextAuth v5 (Credentials, JWT sessions)  |
| Database    | PostgreSQL + Prisma 6                    |
| i18n        | next-intl v4 (DE + EN)                   |
| Validation  | Zod v4                                   |
| Icons       | Lucide React                             |
| Deploy      | Vercel + managed PostgreSQL              |

---

## Project Structure

```
miniAMS/
├── prisma/
│   ├── schema.prisma          # 13 models, multi-tenant
│   └── seed.ts                # Demo data
├── messages/
│   ├── de.json                # German translations
│   └── en.json                # English translations
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (auth)/        # Login, Register
│   │   │   ├── (dashboard)/   # Protected app shell
│   │   │   │   ├── page.tsx           # Dashboard
│   │   │   │   ├── customers/         # CRM
│   │   │   │   ├── projects/          # Projects
│   │   │   │   ├── time/              # Time Tracking
│   │   │   │   ├── invoices/          # Invoicing
│   │   │   │   └── settings/          # Settings
│   │   │   └── layout.tsx
│   │   └── api/auth/          # NextAuth routes
│   ├── components/
│   │   ├── ui/                # 20+ shadcn primitives
│   │   ├── layout/            # Sidebar, TopBar, MobileNav
│   │   ├── shared/            # StatusBadge, EmptyState, etc.
│   │   ├── customers/         # Customer components
│   │   ├── projects/          # Project components
│   │   ├── time/              # Time tracking components
│   │   ├── invoices/          # Invoice components
│   │   └── settings/          # Settings components
│   ├── lib/
│   │   ├── actions/           # 8 server action files
│   │   ├── validations/       # 6 Zod schema files
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma singleton
│   │   ├── tenant.ts          # Tenant context helpers
│   │   └── format.ts          # Date/currency formatters
│   ├── i18n/                  # next-intl config
│   └── types/                 # TypeScript declarations
└── vercel.json                # Deployment config
```

---

## Security

miniAMS implements defense-in-depth for multi-tenant isolation:

- **Tenant scoping** — Every database query includes `tenantId` in the WHERE clause
- **Defense-in-depth** — All UPDATE/DELETE operations include `tenantId` even after pre-checks
- **Cross-tenant validation** — Foreign key references (customerId, serviceId, timeEntryId) validated against tenant
- **Role-based access** — Viewer role blocked from all write operations; delete/cancel restricted to owner/admin
- **Input validation** — All inputs validated via Zod schemas with max-length/max-size constraints
- **Auth guards** — `requireAuth()` verifies both session AND tenantId presence
- **JWT sessions** — Stateless, includes userId, tenantId, role, locale
- **Password hashing** — bcrypt with 12 rounds
- **Global email uniqueness** — Prevents cross-tenant login ambiguity

---

## Module Overview

```mermaid
graph TB
    subgraph Dashboard["Dashboard"]
        D_KPI[Revenue / Open Invoices / Hours / Projects]
        D_RECENT[Recent Invoices & Time Entries]
    end

    subgraph CRM["CRM"]
        C_CUST[Customers]
        C_CONT[Contacts]
        C_PROJ[Projects]
        C_TEAM[Team Members]
    end

    subgraph TimeTracking["Time Tracking"]
        T_TIMER[Live Timer]
        T_MANUAL[Manual Entry]
        T_WEEKLY[Weekly Grid View]
        T_APPROVE[Approval Workflow]
    end

    subgraph Invoicing["Invoicing"]
        I_CREATE[Create Invoice]
        I_IMPORT[Import Time Entries]
        I_STATUS[Status Workflow]
        I_KPI[KPI Dashboard]
    end

    subgraph Settings["Settings"]
        S_PROFILE[Profile & Language]
        S_COMPANY[Company Info]
        S_TEAM[Team Management]
    end

    C_CUST --> C_CONT
    C_CUST --> C_PROJ
    C_PROJ --> C_TEAM
    C_PROJ --> T_TIMER
    C_PROJ --> T_MANUAL
    T_APPROVE --> I_IMPORT
    I_IMPORT --> I_CREATE
    I_CREATE --> I_STATUS
    I_STATUS --> D_KPI
    T_WEEKLY --> D_KPI
```

---

## Getting Started

See **[QUICKSTART.md](./QUICKSTART.md)** for setup instructions.

### Demo Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | `demo@miniams.dev` |
| Password | `password123`      |

---

## Development

```bash
# Start dev server
npm run dev

# Open database GUI
npm run db:studio

# Reset and reseed database
npm run db:push -- --force-reset && npm run db:seed
```

---

## Deployment

miniAMS is optimized for Vercel with managed PostgreSQL.

### Required Environment Variables

| Variable         | Description                    |
|-----------------|--------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string   |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ chars) |

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Project Settings
3. Vercel auto-deploys on push to `main`

The `vercel.json` config handles Prisma generation and optimizes for the `fra1` (Frankfurt) region.

---

## License

Private. All rights reserved.
