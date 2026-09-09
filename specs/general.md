# Contexto de la Aplicación: API de Gestión Documental

Este documento sirve como guía operativa y de contexto del backend del Sistema de Gestión Documental.

## 1. Resumen

- Aplicación: API REST para gestión de documentos del personal.
- Conceptos clave: Usuarios, Roles, Permisos, Contratos, Documentos, Historias de Documento, Archivos y Grupos de Colaboradores.
- Palabras clave: nodejs, express, typescript, ddd, clean-architecture, mysql, api.

## 2. Stack Tecnológico

- Runtime: Bun (sobre Node.js)
- Framework: Express.js
- Lenguaje: TypeScript
- ORM: TypeORM
- Base de datos: MySQL (desarrollo/producción), SQL.js (testing)
- Testing: Bun test, Jest (ecosistema), Supertest
- Calidad: ESLint, Prettier, `tsc` para chequeo de tipos

## 3. Arquitectura

El proyecto aplica **DDD** y **Clean Architecture**, separando dominio, presentación e infraestructura.

### `src/domains` (Núcleo de negocio)

Subdominios disponibles y propósito:
- `contract`: contratos y revisión por usuarios.
- `document`: documentos y su historia de estados.
- `document-type` / `document-subtype`: tipologías de documentos.
- `document-template`: plantillas de documentos.
- `permission`: permisos del sistema.
- `role`: roles de usuario y asignación de permisos.
- `user`: usuarios, autenticación y perfil.
- `colaborators`: colaboradores (personas) del sistema.
- `colaborator-group`: agrupación de colaboradores.
- `file`: metadatos de archivos.

Cada dominio incluye:
- `entities`: objetos de negocio (p.ej., `User`, `Contract`).
- `repositories`: interfaces para persistencia (implementaciones en infraestructura).
- `use-cases`: reglas de aplicación (operaciones atómicas y testeables).
- `value-objects`: objetos inmutables y enums de dominio.

### `src/presentation` (Entrega/HTTP)

- `controllers`: reciben requests, validan con DTO y ejecutan casos de uso.
- `dto`: contratos públicos de entrada/salida y validación.
- `routes`: endpoints y mapeo a controladores; integración con `auth`/`authorize`.

### `src/shared/infrastructure` (Interacción externa)

- `database`: configuración (`typeorm.config.ts`), entidades ORM y migraciones.
- `repositories`: implementaciones TypeORM de los repositorios de dominio.
- `middleware`: errores, validación, autenticación y autorización.
- `security`: utilidades de RBAC y caché de permisos efectivos.

## 4. Recursos y Endpoints

Funcionalidad expuesta vía REST (ver `src/presentation/routes`):
- Usuarios: CRUD, login, permisos efectivos, perfil.
- Roles: CRUD, asignación y consulta de permisos.
- Permisos: CRUD.
- Contratos: CRUD, asignación de revisores, subcontratos.
- Documentos: CRUD, envío a revisión, aprobación/rechazo.
- Document History: consulta de historial por documento.
- Document Types/Subtypes/Templates: CRUD y relaciones.
- Colaborators y Colaborator Groups: CRUD y asignaciones.
- Archivos (storage local/S3): upload y descarga.

Para pruebas manuales existen los archivos `specs/http/*.http` utilizables con el plugin REST Client.

## 5. Ejecución y Comandos

### Instalación

```bash
bun install
```

### Desarrollo

```bash
bun run dev
```

### Testing (SQL.js in-memory)

```bash
bun test
```

### Build

```bash
bun run build
```

### Producción

```bash
bun start
```

### Calidad y tipos

```bash
bun run lint       # Lint con ESLint
bun run lint:fix   # Auto-fix cuando sea posible
bun run lint:ts    # Chequeo de tipos TypeScript (sin emitir código)
```

### Seeds de datos (solo en desarrollo)

```bash
bun run seeder           # Ejecuta seeds
bun run seeder --clean   # Limpia la base y vuelve a sembrar
```

## 6. Migraciones de Base de Datos (TypeORM)

- Crear: `bun run migration:create <nombre>`
- Generar desde entidades: `bun run migration:generate <nombre>`
- Ejecutar: `bun run migration:run`
- Revertir: `bun run migration:revert`
- Mostrar: `bun run migration:show`
- Comparar entidades vs migraciones: `bun run migration:compare`

## 7. Configuración y Seguridad

- Variables `.env` para MySQL y JWT (ver `.env.example`).
- Autenticación por JWT en cabecera `Authorization: Bearer <token>` y cookies.
- RBAC habilitable vía `ENABLE_RBAC` o header `x-enable-rbac` (ver specs/rbac.md).

## 8. Notas de Diseño

- Patrón Repository para aislar dominio de persistencia.
- Casos de uso como operaciones atómicas y testeables.
- Middlewares transversales para validación, errores y permisos.

## 9. Pruebas manuales de API

- Usar `specs/http/*.http` con REST Client.
- Endpoint info: `GET /api` devuelve catálogo básico de rutas y salud.
