# Funcionalidad de Grupos

Este documento describe la implementación y lógica de la funcionalidad de grupos, diseñada para filtrar contenido y manejar permisos de visualización y edición basados en la pertenencia a grupos.

## Descripción General

Los grupos actúan como un mecanismo de partición de datos (multi-tenancy lógico).

- **Usuarios Comunes**: Deben pertenecer siempre a al menos un grupo. Su interacción con el sistema está limitada al contexto de su **grupo seleccionado**.
- **Administradores (`admin:groups`)**: Tienen privilegios para ver todo el contenido, cambiar de grupo, o asignar entidades a grupos específicos explícitamente.

## Reglas de Negocio

1. **Selección de Grupo**:
   - Por simplificar en un principio, un usuario solo puede pertenecer a un grupo.
   - Al iniciar sesión, se define un "grupo seleccionado" (almacenado en la sesión/cookie `groupId`).
   - El contenido mostrado en listas y consultas se filtra automáticamente por este grupo seleccionado.
   - A nivel de entidades, es posible el manejo de múltiples grupos, pero no se permite actualmente, sin embargo solo será necesario modificar la logica, no será necesario alterar las tablas.

2. **Visualización (Listas/GET)**:
   - **Usuario Común**: Solo ve registros asociados a su grupo seleccionado. La columna de "Grupo" se oculta (o es redundante).
   - **Administrador**:
     - Puede ver todos los registros.
     - En las listas, se agrega la columna "Grupo" para identificar el origen del registro.
3. **Creación y Edición (POST/PUT)**:

   - **Usuario Común**: Las entidades creadas se asignan automáticamente a su grupo seleccionado. No pueden elegir otro grupo.
   - **Administrador**: Puede especificar el grupo en el cuerpo de la petición (`body.groupId`) para asignar la entidad a cualquier grupo. Si no lo especifica, se usa su grupo actual. Si no es posible obtener ninguno de los dos, se devolverá un error.

## Implementación Técnica

### Autenticación (`auth.middleware.ts`)

El middleware de autenticación verifica si existe una cookie `groupId`. Si el usuario pertenece a ese grupo, establece `req.auth.groupId`.

### Middlewares de Grupo (`group.middleware.ts`)

Se disponen de dos middlewares principales para manejar la asignación en operaciones de escritura:

#### `assignGroup`

Utilizado principalmente en rutas de creación (`POST`).

- **Lógica**:
  1. Si el usuario es `admin:groups` y envía `groupId` en el body, se usa ese valor.
  2. Si no es admin o no envió el valor, se intenta usar `req.auth.groupId` (el grupo seleccionado en sesión).
  3. Si no hay grupo disponible (ni en body ni en sesión):
     - Admin: Lanza `ValidationError` (El ID es requerido).
     - Usuario: Lanza `ForbiddenError` (Prohibida la creación si no tiene grupo).
- **Resultado**: El `groupId` definitivo se inyecta en `req.body.groupId` para que el controlador lo procese de forma transparente sin interacción del usuario.

#### `changeGroup`

Utilizado en rutas de edición (`PUT`).

- **Lógica**:
  1. Si no se envía `groupId` en el body, se asume que no se quiere cambiar el grupo (se mantiene el actual).
  2. Si se envía `groupId`:
     - Se verifica si el usuario tiene permiso `user:change:group` o `admin:groups`.
     - Si tiene permiso, se acepta el cambio.
     - Si no tiene permiso, lanza `ForbiddenError` (Prohibido cambiar el grupo).

### Ejemplo de Implementación: Módulo Companies

#### Rutas (`company.routes.ts`)

Se aplican los middlewares en los endpoints correspondientes:

```typescript
router.post('/',
  authorize('company:create'),
  assignGroup(), // Inyecta el grupo en el body antes del controlador
  controller.create,
);

router.put('/:id',
  authorize('company:update'),
  changeGroup(), // Permite cambiar el grupo si se tienen permisos
  controller.update,
);

router.get('/',
  authorize('company:read'),
  getByGroup(), // Se valida si el usuario puede consultar esta api
  controller.findAll, // El filtrado se hace dentro usando req.auth.groupId
);
```

#### Controlador (`company.controller.ts`)

- **Create/Update**:
  Reciben el DTO que ya contiene el `groupId` validado por los middlewares.

  ```typescript
  public create = async (req: Request, res: Response) => {
    const dto = req.body as CreateCompanyDto; // dto.groupId ya está seteado
    // ...
  };
  ```
- **List (FindAll)**:
  Utiliza `req.auth.groupId` (proviene de la sesión/auth) para filtrar.

  ```typescript
  public findAll = async (req: Request, res: Response) => {
    const groupId = req.auth.groupId; // undefined si es admin viendo todo
    const companies = await this.listCompaniesUseCase.execute(groupId);
    // ...
  };
  ```

#### Casos de Uso

Los casos de uso deben aceptar `groupId` como parámetro opcional para filtrar las consultas a la base de datos.

```typescript
// list-companies.use-case.ts
async execute(groupId?: number): Promise<Company[]> {
  return await this.companyRepository.findAll(groupId);
}
```
