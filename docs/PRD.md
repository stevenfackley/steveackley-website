# Product Requirements Document (PRD)

**Project:** steveackley.org  
**Version:** 1.0.0  
**Date:** 2026-02-26  
**Author:** Steve Ackley  
**Status:** Approved

---

## 1. Overview

### 1.1 Purpose

`steveackley.org` is a personal website and blog for Steve Ackley — a software engineer with 12+ years of professional experience. The site serves as a professional digital presence, portfolio showcase, and personal blog platform. It is designed to be modern, fast, mobile-first, and a reflection of Steve's minimalist aesthetic sensibility.

### 1.2 Goals

1. Establish a professional online presence at `steveackley.org`
2. Showcase Steve's skills, experience, and projects via a visually engaging home dashboard
3. Provide a self-hosted blogging platform with rich-text authoring and image upload capabilities
4. Enable visitors to connect (LinkedIn, Email) and download a resume
5. Be fully containerized for local development and production deployment to AWS

### 1.3 Non-Goals

- Multi-user blog publishing (single admin only)
- E-commerce or payment processing
- Social media feed integrations
- Comments or user-facing authentication

---

## 2. Target Audience

| Audience | Purpose |
|---|---|
| **Recruiters / Hiring Managers** | Evaluate Steve's skills, experience, and work history |
| **Developers / Collaborators** | Explore projects, read technical blog posts |
| **General visitors** | Learn about Steve's interests and personal brand |
| **Steve (Admin)** | Author and publish blog posts via secure admin panel |

---

## 3. Functional Requirements

### 3.1 Home Page — Bento-Box Dashboard

- **FR-01**: The home page SHALL render a CSS grid "bento-box" layout that organizes sections into varying-size cards
- **FR-02**: Dashboard cards SHALL include: Hero/Intro, Skills, About, Projects, Blog Preview, and CTA
- **FR-03**: Each card SHALL be clickable/navigable, with a visible hover state
- **FR-04**: The layout SHALL be responsive: single column on mobile, multi-column bento grid on tablet/desktop
- **FR-05**: The grid SHALL use asymmetric sizing (some cards spanning multiple columns/rows) for visual interest

### 3.2 Skills & Tech Stack Section

- **FR-06**: Skills section SHALL display a concise bulleted list including: C#, .NET, Azure, SQL, and Full-Stack Development
- **FR-07**: The list SHALL be visually scannable with icons or badges where appropriate

### 3.3 About Section

- **FR-08**: About section SHALL mention 12+ years of software engineering experience
- **FR-09**: About section SHALL include personal interests: Freemasonry, men's fragrances, fitness (WHOOP), outdoor cooking/BBQ, maintaining a 2018 Mustang EcoBoost, and off-grid cabin building

### 3.4 Projects & Portfolio Section

- **FR-10**: Projects section SHALL display a grid/list of project cards
- **FR-11**: One card SHALL link to an active project titled "P1 Ops Hub"
- **FR-12**: Four cards SHALL display as "Coming Soon" placeholders
- **FR-13**: Project cards SHALL include project name, brief description, status badge, and optional link

### 3.5 Call to Action (CTA)

- **FR-14**: CTA section SHALL include a LinkedIn link (opens in new tab)
- **FR-15**: CTA section SHALL include an Email link (`mailto:`)
- **FR-16**: CTA section SHALL include a "Download Resume" button that serves a PDF file

### 3.6 Blog

- **FR-17**: Blog listing page (`/blog`) SHALL display all published posts with title, excerpt, cover image, and date
- **FR-18**: Blog listing SHALL be paginated (10 posts per page)
- **FR-19**: Individual blog post page (`/blog/[slug]`) SHALL render rich HTML content with proper typography
- **FR-20**: Blog posts SHALL support cover images stored on the local filesystem (Docker volume)
- **FR-21**: Blog posts SHALL have slug-based URLs generated from the title

### 3.7 Blog Admin

- **FR-22**: Admin section (`/admin`) SHALL be protected by authentication — accessible only to Steve
- **FR-23**: Admin login SHALL use email + password credentials
- **FR-24**: Admin dashboard SHALL list all posts (published and drafts) with edit/delete actions
- **FR-25**: Admin SHALL be able to create new posts via a rich-text editor (Tiptap)
- **FR-26**: Admin SHALL be able to upload images within the editor; images are stored in the Docker volume
- **FR-27**: Admin SHALL be able to set a post as Published or Draft
- **FR-28**: Admin SHALL be able to edit and delete existing posts
- **FR-29**: Admin SHALL be able to set a cover image for each post

### 3.8 Theme / Appearance

- **FR-30**: Site SHALL automatically switch between dark and light themes based on the user's OS `prefers-color-scheme` setting
- **FR-31**: Both dark and light themes SHALL meet WCAG AA contrast ratios (minimum 4.5:1 for body text)
- **FR-32**: The design SHALL be mobile-first and responsive across all breakpoints

---

## 4. Non-Functional Requirements

### 4.1 Performance

- **NFR-01**: Home page Largest Contentful Paint (LCP) SHALL be under 2.5 seconds on a standard broadband connection
- **NFR-02**: All pages SHALL be statically rendered or server-side rendered using Next.js App Router for fast TTFB
- **NFR-03**: Images SHALL be served via Next.js `<Image>` component for automatic optimization

### 4.2 Security

- **NFR-04**: Admin routes SHALL be protected via NextAuth.js middleware
- **NFR-05**: All database queries SHALL use Prisma ORM (parameterized queries) to prevent SQL injection
- **NFR-06**: File uploads SHALL be validated for MIME type and size before persistence
- **NFR-07**: Passwords SHALL be hashed with bcrypt (minimum cost factor 12)
- **NFR-08**: Security headers SHALL be set in `next.config.js`

### 4.3 Reliability & Availability

- **NFR-09**: PostgreSQL data SHALL be persisted in a named Docker volume to survive container restarts
- **NFR-10**: Uploaded images SHALL be persisted in a named Docker volume to survive container restarts

### 4.4 Maintainability

- **NFR-11**: Codebase SHALL use TypeScript throughout
- **NFR-12**: All environment secrets SHALL be stored in `.env` files (never committed to source control)
- **NFR-13**: A `.env.example` file SHALL document all required environment variables

### 4.5 Deployment

- **NFR-14**: Application SHALL be containerized with Docker (multi-stage build, standalone Next.js output)
- **NFR-15**: `docker-compose.yml` SHALL orchestrate the web application and PostgreSQL database
- **NFR-16**: The Dockerfile SHALL produce an optimized, minimal production image
- **NFR-17**: The application SHALL be deployable to AWS (ECS, EC2, or App Runner) from the Docker image

---

## 5. User Stories

### Visitor

| ID | Story |
|---|---|
| US-01 | As a visitor, I want to see a visually engaging dashboard so I can quickly understand who Steve is |
| US-02 | As a visitor, I want to read Steve's skills and experience so I can assess his professional capabilities |
| US-03 | As a visitor, I want to see Steve's projects so I can evaluate his work |
| US-04 | As a visitor, I want to easily contact Steve or connect on LinkedIn |
| US-05 | As a visitor, I want to download Steve's resume |
| US-06 | As a visitor, I want to read Steve's blog posts |
| US-07 | As a visitor, I want the site to look great on my phone |
| US-08 | As a visitor, I want the site to respect my dark/light mode preference |

### Admin (Steve)

| ID | Story |
|---|---|
| US-09 | As Steve, I want to log in securely to the admin panel |
| US-10 | As Steve, I want to write blog posts with a rich text editor |
| US-11 | As Steve, I want to upload images directly into my blog posts |
| US-12 | As Steve, I want to save posts as drafts before publishing |
| US-13 | As Steve, I want to edit or delete previously published posts |
| US-14 | As Steve, I want to set a cover image for my blog posts |

---

## 6. Constraints & Assumptions

- **Constraint 1**: Development environment is Fedora Linux
- **Constraint 2**: Production deployment target is AWS (specific service TBD)
- **Constraint 3**: Single admin user (no multi-user or role-based access control needed in v1)
- **Assumption 1**: Resume PDF will be manually placed in the `public/` directory
- **Assumption 2**: LinkedIn URL and email address will be provided via environment variables
- **Assumption 3**: "P1 Ops Hub" link URL will be provided via configuration/environment variable

---

## 7. Success Metrics

| Metric | Target |
|---|---|
| Lighthouse Performance Score | ≥ 90 |
| Lighthouse Accessibility Score | ≥ 95 |
| Mobile Responsiveness | Pass on all breakpoints (320px–1920px) |
| WCAG AA Compliance | All text elements meet contrast ratio requirements |
| Admin auth security | No unauthorized access to `/admin` routes |

---

## 8. Future Enhancements (v2+)

- RSS/Atom feed for blog
- SEO meta tags + OpenGraph image generation
- Blog post search
- Tagging / categorization for blog posts
- Contact form with email backend
- Analytics integration (privacy-respecting, e.g., Plausible)
- Dark/light mode manual toggle (in addition to system preference)
