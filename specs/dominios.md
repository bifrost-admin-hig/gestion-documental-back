# Dominios

La capa de **dominio** es el núcleo de la aplicación. Define reglas de negocio, modelos y operaciones de aplicación sin depender de detalles de infraestructura.

## Responsabilidades

- Modelar entidades y objetos de valor del negocio.
- Definir interfaces de repositorio (persistencia abstracta).
- Implementar casos de uso atómicos y testeables.
- Expresar reglas y validaciones del dominio.

## Estructura

- `entities/`: modelos de negocio (p.ej., `User`, `Contract`, `Document`).
- `value-objects/`: tipos inmutables y enums del dominio.
- `repositories/`: interfaces para persistencia (sin dependencias externas).
- `use-cases/`: operaciones del dominio y orquestación de reglas.

## Interacciones permitidas

- El dominio no depende de implementaciones concretas.
- Puede importar utilidades puras desde `shared/domain` o `shared/utils` cuando no acoplen a infraestructura.
- Las implementaciones concretas (TypeORM, HTTP, etc.) viven en `src/shared/infrastructure`.

## Errores y validación

- Usar tipos y clases de error del dominio (p.ej., `ValidationError`, `NotFoundError`).
- Validar invariantes en entidades y value objects.
- Los casos de uso devuelven resultados consistentes y lanzan errores significativos para la capa de presentación.

## Convenciones

- Nombres de archivos: `<operacion>-<modulo>.use-case.ts` para claridad.
- Métodos CRUD mínimos: `save`, `update`, `delete`, `find` adaptados al contexto del módulo.
- Mantener side-effects fuera del dominio (p.ej., logs externos, IO) y delegarlos a infraestructura vía interfaces.

## Testing

- Casos de uso deben probarse con dobles de repositorio (mocks/fakes) del dominio.
- Para integración, usar SQL.js en modo test con configuración en `typeorm.config.ts`.

## Ejemplos

- Contratos: asignación de revisores, subcontratos, estados de contrato.
- Documentos: ciclo de vida (creación, revisión, aprobación/rechazo) y su historial.
