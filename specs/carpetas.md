# Estructura de carpetas de la aplicación

La aplicación está diseñada utilizando la metodología DDD (Domain-Driven Design).

## Arquitectura

La arquitectura de la aplicación se basa en capas, con cada capa encargada de una responsabilidad específica. A continuación, se describe la estructura de las capas:

- **Capa de Presentación**: Se encarga de manejar las solicitudes HTTP y devolver las respuestas adecuadas. Utiliza controladores para delegar la lógica de negocio.
- **Capa de Dominio**: Contiene las entidades, Value Objects y los casos de uso de la aplicación. Define el núcleo de la lógica de negocio.
- **Capa de Infraestructura**: Persistencia de datos, comunicación con servicios externos y operaciones de bajo nivel. Implementa repositorios concretos (TypeORM) y configuración de base de datos.

## Como iniciar un nuevo módulo

Para iniciar un nuevo módulo en la aplicación, esta es la forma recomendada:

1. Iniciamos creando la entidad de dominio.
   - Ruta: `src/domains/<modulo>/entities/<modulo>.entity.ts`.
   - Representa la estructura básica de los datos.
2. Creamos el repositorio de dominio.
   - Ruta: `src/domains/<modulo>/repositories/<modulo>.repository.ts`
   - Define las operaciones CRUD básicas y otras consultas necesarias.
   - Si no necesita operaciones adicionales, puede usar `type` en lugar de `interface` para definirlo.
3. Implementamos los casos de uso.
   - Ruta: `src/domains/<modulo>/use-cases/<tarea(s)>-<modulo>.use-case.ts`
   - Define la lógica de negocio para cada operación.
   - Utiliza el repositorio para interactuar con la persistencia de datos.
   - Se recomienda implementar minimo el CRUD básico.
     - `(save|update|delete|find).<modulo>.use-case.ts`
     - Agregue tambien los casos de uso adicionales que necesite.
4. Creamos la entidad de infraestructura.
   - Ruta: `src/shared/infrastructure/database/entities/<modulo>.entity.ts`
   - Representa la estructura de los datos en la base de datos.
   - Aquí se definen todos los campos, y sus posibles relaciones.
5. Creamos el repositorio de infraestructura.
   - Ruta: `src/shared/infrastructure/repositories/typeorm-<modulo>.repository.ts`
   - Implementa las operaciones CRUD básicas y otras consultas necesarias.
   - Utiliza la entidad de infraestructura para interactuar con la base de datos.
   - Debe implementar los métodos definidos en el repositorio de dominio.
6. Ya podemos generar la migración para la entidad de infraestructura.
   - Ruta: `src/shared/infrastructure/database/migrations/<timestamp>-create-<modulo>-table.ts`
   - Utiliza la entidad de infraestructura para definir la estructura de la tabla.
7. Implementamos los controladores.
   - Ruta: `src/presentation/controllers/<modulo>.controller.ts`
   - Maneja las solicitudes HTTP y delega la lógica de negocio a los casos de uso.
   - Debe implementar los métodos HTTP necesarios (GET, POST, PUT, DELETE, etc.).
8. Implementamos las rutas.
   - Ruta: `src/presentation/routes/<modulo>.routes.ts`
   - Define las rutas HTTP para acceder a los controladores.
   - Utiliza los controladores para manejar las solicitudes.
   - Integrar middlewares `auth` y `authorize` para proteger endpoints por permisos.
   - Validar entrada con `validateRequest` y esquemas en `src/presentation/dto/validation-schemas.ts`.
9. Testeamos las rutas.
   - Ruta: `src/presentation/routes/<modulo>.routes.test.ts`
   - Utiliza `supertest` para probar las rutas HTTP.
   - Verifica que las respuestas sean las esperadas.
10. Añadimos todo lo necesario al contenedor de dependencias.
   - Ruta: `src/dependency-container.ts`
   - Importa y registra los casos de uso, repositorios, rutas, y otras dependencias necesarias.
11. Agregamos las rutas al enrutador principal.
   - Ruta: `src/app.ts`
   - Importa y agrega las rutas de cada módulo.
12. Podemos agregar pruebas manuales http para verificar el funcionamiento de las rutas (opcional).
   - Ruta: `specs/http/<modulo>.http`
   - Utiliza `http` para probar las rutas HTTP.
   - Verifica que las respuestas sean las esperadas.
      - En VSC o similares se pueden probar estas rutas utilizando el plugin `REST Client`.

## Comandos útiles para desarrollo

- `bun run lint:ts`: verificación de tipos sin emitir código.
- `bun run migration:compare`: compara diferencias entre entidades y migraciones generadas.
- `bun run seeder` y `bun run seeder --clean`: semillas de datos en desarrollo.
