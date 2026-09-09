# 🗃️ Migraciones de Base de Datos

## ¿Qué son las Migraciones?

Las **migraciones** son scripts versionados que permiten modificar el esquema de la base de datos de manera controlada y reproducible. Cada migración representa un cambio específico en la estructura de la base de datos (crear tablas, agregar columnas, índices, etc.).

### Ventajas de las Migraciones:
- ✅ **Control de versiones** del esquema de base de datos
- ✅ **Reproducibilidad** en diferentes entornos
- ✅ **Rollback** a versiones anteriores
- ✅ **Colaboración** en equipo sin conflictos de esquema

## 🏗️ Estructura de Migraciones

```
migrations/
├── 1696269600000-CreateUsersTable.ts        # Migración de usuarios
├── 1696269700000-CreateContractsTable.ts    # Migración de contratos
└── README.md                                 # Esta documentación
```

### Convención de Nomenclatura:
```
{timestamp}-{DescripcionCamelCase}.ts
```

Ejemplo: `1696269600000-CreateUsersTable.ts`

## 📝 Crear una Nueva Migración

### 1. Generar Migración Automáticamente
```bash
# Generar migración basada en cambios de entidades
bun run typeorm migration:generate src/shared/infrastructure/database/migrations/NombreMigracion
```

### 2. Crear Migración Vacía
```bash
# Crear migración vacía para cambios manuales
bun run typeorm migration:create src/shared/infrastructure/database/migrations/NombreMigracion
```

### 3. Estructura de una Migración
```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1696269600000 implements MigrationInterface {
  name = 'CreateUsersTable1696269600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cambios hacia adelante (aplicar migración)
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          // ... más columnas
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cambios hacia atrás (revertir migración)
    await queryRunner.dropTable('users');
  }
}
```

## ⚡ Ejecutar Migraciones

### Aplicar Todas las Migraciones Pendientes
```bash
bun run migration:run
```

### Revertir la Última Migración
```bash
bun run migration:revert
```

### Ver Estado de Migraciones
```bash
bun run migration:show
```

## 🔧 Comandos Útiles

### Scripts Disponibles en package.json
```json
{
  "scripts": {
    "migration:create": "typeorm migration:create -d data-source.js",
    "migration:generate": "typeorm migration:generate -d data-source.js",
    "migration:create": "typeorm migration:create",
    "migration:run": "typeorm migration:run -d data-source.js",
    "migration:revert": "typeorm migration:revert -d data-source.js",
    "migration:show": "typeorm migration:show -d data-source.js"
  }
}
```

### Ejemplos de Uso
```bash
# Crear migración para agregar columna
bun run migration:create src/shared/infrastructure/database/migrations/AddPhoneToUsers

# Generar migración automáticamente basada en cambios de entidades
bun run migration:generate src/shared/infrastructure/database/migrations/UpdateUserTable

# Ejecutar migraciones (funciona directamente con TypeScript)
bun run migration:run

# Revertir última migración
bun run migration:revert
```

> 💡 **Nota**: Las migraciones ahora funcionan directamente con archivos TypeScript gracias a `ts-node`. ¡No necesitas compilar antes de ejecutar!

## 📋 Mejores Prácticas

### ✅ Buenas Prácticas
- **Nombres descriptivos**: `AddPhoneColumnToUsers` mejor que `UpdateUsers`
- **Una responsabilidad por migración**: Cada migración debe hacer una cosa específica
- **Siempre implementar `down()`**: Para poder revertir cambios
- **Probar en desarrollo**: Ejecutar y revertir antes de producción
- **Backup antes de producción**: Siempre respaldar antes de aplicar en producción

### ❌ Evitar
- Modificar migraciones ya aplicadas en producción
- Migraciones que no se pueden revertir
- Cambios destructivos sin backup
- Migraciones muy grandes (dividir en pasos pequeños)

## 🚨 Consideraciones Importantes

### Cambios Destructivos
```typescript
// ⚠️ CUIDADO: Esto elimina datos
await queryRunner.dropColumn('users', 'old_column');

// ✅ MEJOR: Migrar datos primero
await queryRunner.query(`
  UPDATE users SET new_column = old_column WHERE old_column IS NOT NULL
`);
await queryRunner.dropColumn('users', 'old_column');
```

### Datos de Prueba
```typescript
// Insertar datos de prueba solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  await queryRunner.query(`
    INSERT INTO users (id, email, first_name, last_name) 
    VALUES ('test-id', 'test@example.com', 'Test', 'User')
  `);
}
```

## 🔄 Flujo de Trabajo Recomendado

1. **Modificar Entidad** en `src/domains/{domain}/entities/`
2. **Generar Migración** con `bun run migration:generate src/shared/infrastructure/database/migrations/NombreMigracion`
3. **Revisar y Ajustar** la migración generada
4. **Probar Localmente** con `migration:run` y `migration:revert`
5. **Commit** la migración junto con los cambios de entidad
6. **Aplicar en Staging/Producción** después de backup

> ✨ **¡Nuevo!** Ya no necesitas ejecutar `bun run build` antes de las migraciones. Todo funciona directamente con TypeScript.

## 📚 Recursos Adicionales

- [Documentación TypeORM Migrations](https://typeorm.io/migrations)
- [Configuración TypeORM](../typeorm.config.ts)
- [Entidades del Proyecto](../entities/)

---

> 💡 **Tip**: Siempre prueba tus migraciones localmente antes de aplicarlas en producción. Un simple `migration:run` seguido de `migration:revert` puede evitar muchos problemas.