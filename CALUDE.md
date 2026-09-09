# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Gestion Documental Backend**: REST API for personnel document management system built with **Domain-Driven Design (DDD)** and **Clean Architecture**. Uses Bun runtime, TypeScript, Express.js, MySQL 8.0+, and TypeORM 0.3+.

## Project Structure

```
src/
├── domains/              # Business logic (User, Contract, Document, etc.)
│   ├── {domain}/
│   │   ├── entities/     # Domain entities (business objects)
│   │   ├── repositories/ # Repository interfaces
│   │   ├── use-cases/    # Business use cases (command handlers)
│   │   └── value-objects/ # Value types (enums, email, salary, etc.)
├── shared/              # Shared infrastructure
│   ├── infrastructure/   # Database, external APIs, cache
│   │   ├── database/     # TypeORM config, migrations, entities
│   │   ├── repositories/ # Repository implementations
│   │   └── external-apis/ # HTTP clients
│   ├── middleware/       # Express middleware (auth, error handling)
│   ├── domain/           # Shared domain errors
│   └── utils/            # Utilities (date, file, compare, etc.)
├── presentation/        # HTTP layer (Controllers, Routes, DTOs)
│   ├── controllers/      # HTTP handlers
│   ├── routes/           # Express route definitions
│   └── dto/              # Request/Response DTOs
├── index.ts            # Entry point (bootstrap server)
└── app.ts              # Express app setup, middleware, routes
```

## Essential Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Hot reload development server (port 3000) |
| `bun run build` | Compile TypeScript to dist/ |
| `bun start` | Run compiled app (production) |
| `bun test` | Run all tests in src/ |
| `bun test --watch` | Watch mode tests |
| `bun test --coverage` | Coverage report |
| `bun run lint` | ESLint check |
| `bun run lint:fix` | Auto-fix linting issues |
| `bun run lint:ts` | Type check only (no emit) |

## Database & Migrations

### Migrations

Located in `src/shared/infrastructure/database/migrations/`. Each migration has `up()` (apply) and `down()` (revert) methods.

```bash
bun run migration:generate src/shared/infrastructure/database/migrations/DescriptionCamelCase
# Auto-generate from entity changes
bun run migration:run    # Apply pending migrations
bun run migration:revert # Revert last migration
bun run migration:show   # View migration status
```

**Workflow**: Modify entity → Generate migration → Review → Test locally with `migration:run` + `migration:revert` → Commit

### Seeds

Initial data seeded on first run (dev only). Controlled by `src/shared/infrastructure/database/seeds/initial-seeds.ts`.

```bash
bun run seeder           # Run seeds
bun run seeder --clean   # Drop tables and re-seed
```

### Configuration

MySQL credentials from `.env`:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `DB_ROOT_USERNAME`, `DB_ROOT_PASSWORD` (for migrations/setup)
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`

See `.env.example` for full config (S3, SMTP, rate limiting, RBAC flag).

## Architecture Patterns

### Repository Pattern

**Repository** = translator between domain objects and database. All DB queries happen via repository methods.

- **Interface** in `src/domains/{domain}/repositories/`: defines what operations exist
- **Implementation** in `src/shared/infrastructure/repositories/`: TypeORM implementation with `toEntity()` (domain → DB) and `toDomain()` (DB → domain) converters
- Always return domain objects, not entities

See `src/shared/infrastructure/repositories/README.md` for examples (find by RUT, expiring contracts, etc.).

### Dependency Injection

`src/dependency-container.ts`: Instantiates all controllers, use cases, repositories. Called once at app bootstrap.

For new domain: Create DI methods in the container, call from `app.ts` route setup.

### Path Aliases

TypeScript paths configured in `tsconfig.json`:
- `@domains/*` → `src/domains/*`
- `@shared/*` → `src/shared/*`
- `@presentation/*` → `src/presentation/*`
- `@/*` → `src/*`

Use these everywhere (cleaner imports).

## Key Features

- **RBAC**: Role-Based Access Control (enabled via `ENABLE_RBAC=true`). Permission cache in `src/shared/infrastructure/cache/`
- **Rate Limiting**: Express rate limiter on `/api` (configurable via `.env`)
- **Security**: Helmet (headers), CORS (origins from `.env`), JWT (httpOnly cookies)
- **Error Handling**: Global error handler in `src/shared/middleware/error-handler.ts` + custom error classes in `src/shared/domain/errors.ts`
- **Logging**: Morgan for HTTP logs (disabled in tests), Winston for app logs
- **File Upload**: Local or AWS S3, configured via `FILE_STORAGE` env var

## Testing

- Uses Bun's native test runner (Jest-compatible)
- Test files colocated: `src/**/*.test.ts` or `src/**/*.spec.ts`
- Mock repositories easily (in-memory array implementations)

Example test structure:
```typescript
import { describe, it, expect } from 'bun:test';

describe('UseCase', () => {
  it('should do something', async () => {
    const result = await useCase.execute({ input });
    expect(result).toEqual(expected);
  });
});
```

## Health Check & API Info

- `/health` → uptime, environment
- `/api` → endpoints list

## Hot Reload

`bun run dev` watches `src/` for changes and restarts the server automatically.

## Adding New Features

1. **New domain**: Create folder in `src/domains/{domain}` with entities, repositories (interface), use-cases
2. **Repository impl**: Add to `src/shared/infrastructure/repositories/typeorm-{domain}.repository.ts`
3. **Controller**: Add to `src/presentation/controllers/{domain}.controller.ts`
4. **Routes**: Add to `src/presentation/routes/{domain}.routes.ts`
5. **DI**: Register in `src/dependency-container.ts`
6. **App**: Mount routes in `src/app.ts` setupRoutes()
7. **Database**: Generate migration if adding tables/columns

## Debugging Tips

- **TypeScript errors**: `bun run lint:ts` (type check without emit)
- **DB connection**: Check `.env` credentials, run migrations with `migration:show`
- **Hot reload not working**: Check file syntax (errors prevent reload)
- **RBAC issues**: Ensure permissions cached and `ENABLE_RBAC=true`
- **Tests failing**: Run single test with `bun test src/path/to/test.ts`

## Code Quality Standards

These are the standards Claude should enforce and follow when writing or reviewing code in this project.

### Architecture rules
- Business logic belongs exclusively in `domains/` — never in controllers, routes, or repositories
- Controllers only handle HTTP: parse request, call use case, return response
- Repository implementations only handle persistence: no business rules, no domain logic
- Use cases do one thing — if a use case needs another use case, inject it as a dependency
- Always use path aliases (`@domains/`, `@shared/`, `@presentation/`) — never relative `../../` imports

### TypeScript rules
- Never use `any` — use explicit types, generics, or `unknown` with type guards
- All function parameters and return types must be explicitly typed
- DTOs must be typed interfaces or classes, never plain objects
- Domain errors must extend from `src/shared/domain/errors.ts`

### Security rules
- Never log passwords, JWT tokens, RUTs, or any personal data
- Never hardcode credentials, secrets, or API keys — always use environment variables
- Always validate and sanitize external inputs before they reach use cases
- Sensitive endpoints must check RBAC permissions when `ENABLE_RBAC=true`

### Database rules
- Every entity change (new column, table, relation) requires a migration
- Never modify existing migrations — create a new one
- Repository implementations must always use `toDomain()` and `toEntity()` converters
- Never return raw TypeORM entities outside the repository layer

### Testing rules
- New use cases must have at least one unit test
- Test files go next to the file they test: `use-case.ts` → `use-case.test.ts`
- Use in-memory repository mocks, never a real database in unit tests
- New environment variables must be added to `.env.example`