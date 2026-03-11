# steveackley.org
[![CI / Deploy to GHCR & EC2](https://github.com/stevenfackley/steveackley-website/actions/workflows/deploy.yml/badge.svg)](https://github.com/stevenfackley/steveackley-website/actions/workflows/deploy.yml)

![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white) ![Docker](https://img.shields.io/badge/docker-%232496ED.svg?style=for-the-badge&logo=docker&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) ![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TailwindCSS](https://img.shields.io/badge/tailwind%20css-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)


A modern, mobile-first personal website and blog for Steve Ackley — built with Astro 5, React, Tailwind CSS, and PostgreSQL.

---

## ✨ Features

- **Bento-box dashboard** — Visually engaging home page that showcases skills, projects, and contact links
- **Astro 5 Islands** — Static speed with React interactive components where needed
- **Dark & Light mode** — Automatically respects system `prefers-color-scheme`, WCAG AA compliant
- **Blog** — Full-featured blog backed by PostgreSQL with rich-text editing (Tiptap)
- **Better-Auth** — Secure, modern authentication with role-based access control
- **Cloudflare R2 Storage** — Durable, high-performance object storage for images
- **Fully Dockerized** — Multi-stage build, docker-compose for local development and production

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 (Server Mode) |
| Frontend | React 19 (Islands) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM |
| Auth | Better-Auth |
| Storage | Cloudflare R2 |
| Rich Text | Tiptap 2 |
| Containerization | Docker + Docker Compose |

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/stevenfackley/steveackley-website.git
cd steveackleyorg
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` — see [Environment Variables](#-environment-variables) for details.

### 4. Start PostgreSQL with Docker

```bash
docker compose -f docker-compose.dev.yml up -d db
```

### 5. Run database migrations

```bash
npm run db:push
```

### 6. Start the development server

```bash
npm run dev
```

---

## 🐳 Docker (Full Stack)

### Start everything with Docker Compose

```bash
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret for Better-Auth |
| `BETTER_AUTH_URL` | Base URL for auth callbacks |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Key |
| `R2_BUCKET` | R2 Bucket name |
| `R2_PUBLIC_URL` | Public URL for R2 objects |

---

## 📖 Documentation

| Document | Description |
|---|---|
| [docs/DATABASE.md](./docs/DATABASE.md) | Database architecture and schema |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security guidelines |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | CI/CD and production setup |

---

## 📜 License

Copyright (c) 2025-2026 Steve Ackley. See [LICENSE](./LICENSE) for full terms.
