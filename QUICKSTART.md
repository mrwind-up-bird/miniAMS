# Quick Start Guide

Get miniAMS running locally in under 5 minutes.

## Prerequisites

| Tool       | Version  | Install                          |
|------------|----------|----------------------------------|
| Node.js    | >= 20    | https://nodejs.org               |
| PostgreSQL | >= 14    | `brew install postgresql@16`     |
| npm        | >= 10    | Ships with Node.js               |

## 1. Clone & Install

```bash
git clone https://github.com/mrwind-up-bird/miniAMS.git
cd miniAMS
npm install
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/miniams"
NEXTAUTH_SECRET="your-secret-key-min-32-chars-long-here"
NEXTAUTH_URL="http://localhost:3000"
```

> Generate a secret: `openssl rand -base64 32`

## 3. Set Up Database

```bash
# Create the database
createdb miniams

# Push schema to database
npm run db:push

# Seed with demo data
npm run db:seed
```

## 4. Start Development Server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

## Demo Login

| Field    | Value               |
|----------|---------------------|
| Email    | `demo@miniams.dev`  |
| Password | `password123`       |
| Role     | Owner               |
| Language | German (DE)         |

## Available Commands

| Command            | Description                    |
|--------------------|--------------------------------|
| `npm run dev`      | Start dev server (Turbopack)   |
| `npm run build`    | Production build               |
| `npm run start`    | Start production server        |
| `npm run lint`     | Run ESLint                     |
| `npm run db:push`  | Push schema changes to DB      |
| `npm run db:seed`  | Seed demo data                 |
| `npm run db:studio`| Open Prisma Studio (DB GUI)    |
| `npm run db:migrate`| Create migration              |

## Register a New Account

1. Go to http://localhost:3000/en/register
2. Enter your name, company name, email, and password
3. This creates a new **tenant** (company) with you as **owner**
4. Each tenant's data is fully isolated

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - DATABASE_URL (your managed PostgreSQL connection string)
# - NEXTAUTH_SECRET (same as local or generate new)
```

## Troubleshooting

**"Cannot find module '@prisma/client'"**
```bash
npx prisma generate
```

**"Database does not exist"**
```bash
createdb miniams
npm run db:push
```

**"Invalid credentials" on login**
```bash
npm run db:seed  # Re-seeds demo user
```
