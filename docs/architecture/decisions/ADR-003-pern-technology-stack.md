# ADR-003: PERN Technology Stack Selection

**Date:** 2025-12-02  
**Status:** Accepted  
**Deciders:** Architecture Team  
**Relates to:** SRS v1.2 Section 2.4 (Design Constraints), Section 16 (Technology Stack Specification)

---

## Context

The Self-Service Snack Bar Kiosk System requires a modern, full-stack technology solution to build:

1. **Kiosk Interface:** Customer-facing touchscreen application for browsing products and completing purchases
2. **Admin Web Portal:** Administrative interface for managing products, inventory, statistics, and configuration
3. **Backend API:** RESTful service handling business logic, payment processing, and data operations
4. **Database:** Persistent storage for products, transactions, inventory, and configuration

Key requirements from the SRS influencing this decision:

1. **SRS Section 2.4:** Explicitly specifies PERN stack (PostgreSQL, Express.js, React, Node.js)
2. **NFR-1.1 to NFR-1.5:** Performance requirements (300ms filter changes, 200ms cart operations, 2s page load)
3. **NFR-14:** Browser support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
4. **NFR-19.1:** Architecture should support future multi-kiosk expansion
5. **SRS Section 16:** Comprehensive technology stack specification with exact versions

### Team Considerations

- Development team familiar with JavaScript/TypeScript ecosystem
- Single codebase language (JavaScript) reduces context switching
- Rich ecosystem of npm packages for common functionality
- Strong community support and documentation

---

## Decision

We will adopt the **PERN stack** as the primary technology stack:

- **P**ostgreSQL 18 - Primary relational database
- **E**xpress.js 5.1 - Backend web framework
- **R**eact 19.2 - Frontend UI library
- **N**ode.js 24.11 LTS - JavaScript runtime

### Stack Components and Versions

#### Backend (Node.js + Express.js)

| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 24.11 LTS | JavaScript runtime with V8 engine |
| **Express.js** | 5.1 | Minimalist web framework for REST API |
| **pg (node-postgres)** | 8.11.x | PostgreSQL client with connection pooling |
| **bcrypt** | 5.1.x | Password hashing with salt |
| **jsonwebtoken** | 9.0.x | JWT authentication tokens |
| **helmet** | 7.1.x | Security headers middleware |
| **cors** | 2.8.x | Cross-origin resource sharing |
| **express-validator** | 7.0.x | Input validation and sanitization |
| **nodemailer** | 6.9.x | Email notifications |
| **morgan** | 1.10.x | HTTP request logging |
| **compression** | 1.7.x | Response compression |
| **sharp** | 0.33.x | Image processing (resize, compress, WebP) |

#### Frontend (React)

| Component | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2 | UI component library |
| **react-router-dom** | 6.20.x | Client-side routing |
| **axios** | 1.6.x | HTTP client for API calls |
| **Vite** | 5.0.x | Build tool and dev server |

#### UI Component Library (Choose One)

**Option A: Material-UI (MUI)** - Recommended

- `@mui/material` 5.14.x
- `@mui/icons-material` 5.14.x
- Google Material Design implementation
- Comprehensive accessible components

**Option B: Chakra UI** - Alternative

- `@chakra-ui/react` 2.8.x
- Modular and accessible components
- Simple prop-based styling

#### Date/Time Handling (Choose One)

**Option A: date-fns** - Recommended

- Tree-shakable, immutable functions
- Modern JavaScript date utility

**Option B: Day.js** - Alternative

- Lightweight (2KB)
- Moment.js-compatible API

#### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 8.x | JavaScript/React linting |
| **Prettier** | 3.x | Code formatting |
| **Jest** | 29.x | Unit and integration testing |
| **Supertest** | 6.3.x | API endpoint testing |
| **React Testing Library** | 14.x | React component testing |

#### Process Management and Deployment

| Tool | Version | Purpose |
|------|---------|---------|
| **PM2** | 2.5+ | Node.js process management, clustering |
| **Nginx** | 1.24+ | Reverse proxy, SSL termination |
| **Docker** | 24.x | Containerization |
| **Docker Compose** | 2.x | Container orchestration |

### Optional but Recommended: TypeScript

**TypeScript 5.3.x** is recommended for:

- Static type checking
- Better IDE support and autocomplete
- Catch errors at compile time
- Self-documenting code

Type definitions needed:

- `@types/node`
- `@types/express`
- `@types/react`
- `@types/react-dom`

---

## Consequences

### Positive Consequences

1. **Single Language Stack:**
   - JavaScript/TypeScript across frontend and backend
   - Reduced context switching for developers
   - Code sharing possible between client and server
   - Unified tooling (npm, ESLint, Prettier)

2. **Performance:**
   - Node.js V8 engine provides excellent async performance
   - React Virtual DOM enables efficient UI updates
   - Vite provides fast HMR (Hot Module Replacement) in development
   - Express.js minimal overhead for API requests

3. **Developer Experience:**
   - Rich npm ecosystem (2M+ packages)
   - Excellent tooling support
   - Strong community and documentation
   - Quick iteration with Vite dev server

4. **React Benefits:**
   - Functional components with hooks (useState, useEffect, etc.)
   - Component-based architecture for reusability
   - Large ecosystem of UI component libraries
   - Strong typing with TypeScript

5. **Express.js Benefits:**
   - Minimalist, unopinionated framework
   - Robust middleware ecosystem
   - Easy integration with PostgreSQL via node-postgres
   - Flexible routing for RESTful APIs

6. **Scalability:**
   - Stateless API design enables horizontal scaling
   - PM2 clustering utilizes multiple CPU cores
   - React SPA reduces server load
   - PostgreSQL connection pooling handles concurrent requests

7. **Security:**
   - Helmet.js provides security headers out of the box
   - Express-validator for input sanitization
   - bcrypt for secure password hashing
   - JWT for stateless authentication

8. **Future-Ready:**
   - TypeScript adoption path available
   - WebSocket support for real-time features
   - Easy migration to serverless if needed
   - Container-ready architecture

### Negative Consequences

1. **Single-Threaded Nature:**
   - Node.js event loop is single-threaded
   - CPU-intensive tasks can block the event loop
   - Need PM2 clustering for multi-core utilization

2. **JavaScript Quirks:**
   - Dynamic typing can lead to runtime errors (mitigated by TypeScript)
   - `==` vs `===` confusion
   - Async/await error handling complexity

3. **Dependency Management:**
   - Large node_modules size
   - Security vulnerabilities in transitive dependencies
   - Breaking changes in major version updates
   - Need for regular dependency audits

4. **Learning Curve:**
   - React hooks paradigm requires understanding
   - Express.js middleware ordering matters
   - PostgreSQL query optimization knowledge needed

5. **Not Ideal For:**
   - Heavy computation tasks (image processing offloaded to sharp)
   - Real-time applications requiring WebSocket (polling used instead)

### Mitigation Strategies

- Use TypeScript for type safety
- Run `npm audit` regularly for security
- Implement comprehensive logging for debugging
- Use PM2 clustering for performance
- Offload CPU-intensive tasks (image processing) to worker threads or sharp

---

## Alternatives Considered

### 1. MEAN Stack (MongoDB, Express, Angular, Node) - Rejected

- **Description:** Similar stack with MongoDB and Angular instead
- **Pros:** Angular's opinionated structure, MongoDB flexibility
- **Cons:** MongoDB lacks ACID transactions, Angular steeper learning curve
- **Rejection Reason:** PostgreSQL required by SRS; React preferred for its flexibility and smaller bundle

### 2. Django + React (Python Backend) - Rejected

- **Description:** Python Django backend with React frontend
- **Pros:** Django ORM, admin panel out of box, Python ecosystem
- **Cons:** Two languages (Python + JavaScript), Django overhead
- **Rejection Reason:** SRS specifies Node.js; single-language stack preferred

### 3. Spring Boot + React (Java Backend) - Rejected

- **Description:** Java Spring Boot backend with React frontend
- **Pros:** Enterprise-grade, strong typing, mature ecosystem
- **Cons:** Java complexity, longer development time, higher memory usage
- **Rejection Reason:** Overkill for single-kiosk application; SRS specifies Node.js

### 4. Ruby on Rails + React - Rejected

- **Description:** Ruby on Rails backend with React frontend
- **Pros:** Convention over configuration, rapid development
- **Cons:** Ruby performance, two languages, smaller community than Node.js
- **Rejection Reason:** SRS specifies Node.js; team more familiar with JavaScript

### 5. Next.js Full Stack - Considered but Deferred

- **Description:** React framework with built-in API routes
- **Pros:** SSR, file-based routing, excellent DX
- **Cons:** Opinionated structure, SSR overhead for kiosk SPA
- **Rejection Reason:** SRS specifies separate Express.js API; may consider for future versions

---

## Implementation Notes

### Project Structure

```
snackbar/
├── server/                    # Backend
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── models/            # Database queries
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   └── utils/             # Helpers
│   ├── package.json
│   ├── server.ts
│   └── ecosystem.config.json  # PM2 configuration
├── client/                    # Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client
│   │   └── utils/             # Helpers
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── docs/
```

### Backend package.json Scripts

```json
{
  "scripts": {
      "start": "node dist/server.js",
      "dev": "nodemon --watch src --ext ts,tsx --exec \"ts-node --project tsconfig.json src/server.ts\"",
      "test": "jest --config jest.config.ts --coverage",
      "lint": "eslint src --ext .js,.ts",
      "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

### Frontend package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
      "test": "vitest run",
      "lint": "eslint \"src/**/*.{js,jsx,ts,tsx}\""
  }
}
```

### API Architecture

```
/api
├── /auth
│   ├── POST /login            # Admin login
│   └── POST /logout           # Admin logout
├── /products
│   ├── GET /                  # List products (kiosk)
│   ├── GET /:id               # Get product details
│   ├── POST /                 # Create product (admin)
│   ├── PUT /:id               # Update product (admin)
│   └── DELETE /:id            # Soft delete product (admin)
├── /categories
│   ├── GET /                  # List categories
│   ├── POST /                 # Create category (admin)
│   ├── PUT /:id               # Update category (admin)
│   └── DELETE /:id            # Delete category (admin)
├── /transactions
│   ├── POST /                 # Create transaction (kiosk)
│   ├── GET /                  # List transactions (admin)
│   └── GET /stats             # Statistics (admin)
├── /inventory
│   ├── GET /                  # List inventory (admin)
│   └── PUT /:productId        # Update stock (admin)
├── /config
│   ├── GET /                  # Get configuration (admin)
│   └── PUT /                  # Update configuration (admin)
└── /webhooks
    └── POST /mobilepay        # MobilePay callback
```

---

## References

- [SRS v1.2 - Section 2.4: Design Constraints](/reqeng/Software_Requirements_Specification_v1.2.md)
- [SRS v1.2 - Section 16: Technology Stack Specification](/reqeng/Software_Requirements_Specification_v1.2.md)
- [C4 Architecture - Technology Stack Summary](/docs/architecture/C4_Architecture.md)
- [Node.js Documentation](https://nodejs.org/docs/latest-v24.x/api/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
