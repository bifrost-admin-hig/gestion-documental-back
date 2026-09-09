# Sistema de Roles y Permisos (RBAC)

## Objetivos

- Roles jerárquicos con herencia de permisos.
- Protección de endpoints por permisos efectivos.
- Caché de permisos por usuario.
- Compatibilidad retro mediante flag de activación.

## Activación

- Variable de entorno: `ENABLE_RBAC=true` habilita autenticación/autorización.
- Header `x-enable-rbac`: en desarrollo/pruebas puede habilitar/deshabilitar dinámicamente.
- Producción: prevalece `ENABLE_RBAC`; el header solo puede utilziarse para habilitarlo si está inactivo.

## Autenticación

- Autenticación vía JWT en `Authorization: Bearer <token>` y cookies.
- En desarrollo/pruebas se permite `Bearer user-id:<id>` para evitar generar un verdadero token. Esto es útil para flujos sin validación real. Se puede usar `random` para evitar tener que pasar un ID específico.

## Autorización

- Middleware `authorize("perm")` valida el permiso efectivo del usuario.
- Convención de nombres de permisos por módulo, ejemplo:
- `user:create|read|update|delete|assign:role`
- `role:create|read|update|delete|assign:permissions`
- `permission:create|read|update|delete`
- `contract:create|read|update|delete|assign:reviewer`
- `document:create|read|update|delete|review`
- `colaborator-group:create|read|update|delete|assign:colaborator`

## Modelo de Datos

- `roles`: `id`, `name` (único), `description`, timestamps, `parent_id` opcional para jerarquía.
- `permissions`: `id`, `name` (único), `description`, timestamps.
- `role_permissions` (M:N): `role_id`, `permission_id`.
- `user_roles` (M:N): `user_id`, `role_id`.

## Herencia de Permisos

- Un usuario hereda los permisos de todos sus roles.
- Cada rol hereda los permisos de su `parent` recursivamente.
- Resultado: unión de permisos propios + ancestrales.

## Caché

- Caché en memoria con TTL (60s) por usuario para permisos efectivos.
- Invalida por expiración o manualmente cuando cambian roles/permisos.

## Endpoints protegidos

- `/api/roles`, `/api/permissions`, `/api/users`, `/api/contracts`, `/api/documents`, etc.
- Aplicar `auth` + `authorize` según el permiso de operación.

## Migración y compatibilidad

- Convivencia con clientes antiguos: desactivar RBAC (`ENABLE_RBAC=false`).
- Recomendación: añadir `parent_id` en producción vía migración si se usa jerarquía.
- Verificar relación M:N `user_roles` y `role_permissions` en migraciones.

## Pruebas

- Validar 401/403, herencia `parent→child`, actualización de caché.
- Controladores existentes siguen funcionando con RBAC desactivado.

## Buenas prácticas

- Definir catálogo de permisos por módulo y documentarlo.
- Asignar permisos a roles (no directamente a usuarios).
- Usar caché distribuido (Redis) en producción.
