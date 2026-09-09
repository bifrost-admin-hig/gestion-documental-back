# Gestión Documental - Backend

API REST para sistema de gestión documental de personal desarrollada con **Domain-Driven Design (DDD)** y **Clean Architecture**.

## 🛠️ Tecnologías

- **Runtime**: Bun 1.0+ (JavaScript/TypeScript ultra rápido)
- **Lenguaje**: TypeScript 5.3+
- **Framework**: Express.js 4.18+
- **Base de Datos**: MySQL 8.0+
- **ORM**: TypeORM 0.3+
- **Arquitectura**: DDD + Clean Architecture

## 📁 Estructura del Proyecto

```
src/
├── domains/           # Dominios de negocio (User, Contract)
├── shared/           # Código compartido (DB, utils, middleware)
├── presentation/     # Controllers y Routes (API REST)
└── index.ts         # Punto de entrada
```

## 🚀 Instalación

### Prerequisitos

- **Bun**: >= 1.0.0
- **MySQL**: >= 8.0 (compatible con AWS RDS MySQL)

### Pasos

1. **Instalar Bun** (si no lo tienes):

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

2. **Clonar e instalar dependencias**:

```bash
git clone <repository-url>
cd gestion-documental-back
bun install
```

3. **Configurar variables de entorno**:

```bash
cp .env.example .env
# Editar .env con tus credenciales de MySQL
```

4. **Ejecutar en desarrollo**:

```bash
bun run dev
```

## 💾 Base de Datos MySQL

### Configuración Local

```bash
# Instalar MySQL (Ubuntu/Debian)
sudo apt update
sudo apt install mysql-server

# Crear base de datos
sudo mysql -u root -p
CREATE DATABASE gestion_documental;
CREATE USER 'gestion_user'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON gestion_documental.* TO 'gestion_user'@'localhost';
FLUSH PRIVILEGES;
```

Para desarrollo se puede usar docker-compose de forma alternativa. Mas detalles tendrás mas detalles al respecto.

### Variables de Entorno (.env)

```bash
# Configuración MySQL Local
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=gestion_user
DB_PASSWORD=tu_password
DB_DATABASE=gestion_documental
```

### 🔄 Migraciones de Base de Datos

Las migraciones permiten versionar y aplicar cambios en el esquema de la base de datos:

```bash
# Crear migración vacía
bun run migration:create <nombre>

# Generar migración desde entidades
bun run migration:generate <nombre>

# Ejecutar migraciones pendientes
bun run migration:run

# Revertir última migración
bun run migration:revert
# para revertir más de una migración se ejecuta varias veces

# Ver estado de migraciones
bun run migration:show

# Comparar entidades vs migraciones generadas
bun run migration:compare
```

📚 **[Guía completa de Migraciones](src/shared/infrastructure/database/migrations/README.md)** - Cómo crear, ejecutar y gestionar migraciones

## 🎯 Comandos Principales

```bash
bun run dev      # Desarrollo con hot reload
bun run build    # Compilar para producción
bun start        # Ejecutar en producción
bun test         # Ejecutar tests
bun run lint     # Lint con ESLint
bun run lint:fix # Auto-fix donde sea posible
bun run lint:ts  # Chequeo de tipos TypeScript (sin emitir código)

# Seeds de datos (solo en development)
bun run seeder           # ejecuta seeds
bun run seeder --clean   # limpia la base y vuelve a sembrar
```

## 🏗️ Arquitectura

El proyecto implementa **Domain-Driven Design (DDD)** con **Clean Architecture**:

- **Domains**: Lógica de negocio pura (User, Contract)
- **Shared**: Infraestructura compartida
- **Presentation**: API REST endpoints

Esta arquitectura garantiza:

- Separación clara de responsabilidades
- Código testeable y mantenible
- Escalabilidad para nuevos módulos

### 🔄 Pattern Repository

Este proyecto utiliza el **patrón Repository** para separar la lógica de negocio de la persistencia de datos:

```
🏢 Aplicación  ↔️  📚 Repository  ↔️  🗄️ Base de Datos
   Contract           Traductor        contracts table
   User              Interface         users table
```

**¿Nuevo en el equipo?** 👋
📖 **[Guía completa de Repositories](src/shared/infrastructure/repositories/README.md)** - Todo lo que necesitas saber con ejemplos prácticos

### 🎯 Beneficios del Repository Pattern:

- ✅ **Testeable**: Fácil de hacer mocks para testing
- ✅ **Mantenible**: Cambiar base de datos sin tocar lógica
- ✅ **Limpio**: Separación clara entre dominio e infraestructura
- ✅ **Escalable**: Agregar nuevas consultas es simple

# Docker

Para desarrollo, se puede utilizar docker.
Por el momento solo está disponible la base de datos.

## 🐳 Docker Compose

```bash
docker-compose up -d
```

## 📚 Especificaciones y pruebas manuales

- Directorio `specs/http/` contiene archivos utilizables con el plugin REST Client para probar endpoints.
- Ver `specs/general.md` para arquitectura y comandos del proyecto.
