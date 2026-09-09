# 📚 Repositories - Guía para Desarrolladores

## 🤔 ¿Qué es un Repository?

Un **Repository** es el "traductor" entre tu lógica de negocio y la base de datos. Es el puente que convierte objetos de tu aplicación en filas de base de datos y viceversa.

### 🌍 Dos Mundos Diferentes

```
🏢 APLICACIÓN (Dominio)     ↔️ REPOSITORY ↔️     🗄️ BASE DE DATOS
   Contract objects                                contracts table
   User objects                                    users table
   Business logic                                  SQL queries
```

## 🔄 ¿Cómo Funciona?

### 1. **Guardar un Contrato**

```typescript
// EN TU APLICACIÓN (Use Case)
const contrato = Contract.create({
  nombreColaborador: "María González",
  rutSociedad: "76543210-K",
  contractType: ContractType.INDEFINIDO,
  startDate: new Date("2024-01-15")
});

// EL REPOSITORY se encarga de:
const savedContract = await contractRepository.save(contrato);

// INTERNAMENTE hace esto en MySQL:
// INSERT INTO contracts (
//   nombre_colaborador, 
//   rut_sociedad, 
//   contract_type, 
//   start_date
// ) VALUES (
//   "María González", 
//   "76543210-K", 
//   "indefinido", 
//   "2024-01-15"
// );
```

### 2. **Buscar Contratos**

```typescript
// TU CÓDIGO dice: "búscame contratos activos"
const contractsActivos = await contractRepository.findByStatus(ContractStatus.ACTIVE);

// EL REPOSITORY internamente:
// 1. Ejecuta: SELECT * FROM contracts WHERE status = 'active'
// 2. Convierte cada fila a un objeto Contract
// 3. Te devuelve un array de Contract[]
```

## 🏗️ Estructura de un Repository

### **Interface** (Contrato)
```typescript
// Define QUÉ operaciones puedes hacer
export interface ContractRepository {
  save(contract: Contract): Promise<Contract>;
  findById(id: string): Promise<Contract | null>;
  findByStatus(status: ContractStatus): Promise<Contract[]>;
  delete(id: string): Promise<void>;
}
```

### **Implementación** (TypeORM)
```typescript
// Define CÓMO se hacen las operaciones
export class TypeOrmContractRepository implements ContractRepository {
  
  async save(contract: Contract): Promise<Contract> {
    // 1. Convertir Contract → ContractEntity
    const entity = this.toEntity(contract);
    
    // 2. Guardar en base de datos
    const saved = await this.repository.save(entity);
    
    // 3. Convertir ContractEntity → Contract
    return this.toDomain(saved);
  }
  
  // Más métodos...
}
```

## 🔧 Métodos de Conversión

### **`toDomain()`** - De Base de Datos → Aplicación

```typescript
private toDomain(entity: ContractEntity): Contract {
  // Datos de MySQL (snake_case)
  const entity = {
    id: "uuid-123",
    nombre_colaborador: "Juan Pérez",
    rut_sociedad: "12345678-9",
    contract_type: "indefinido",
    start_date: "2024-01-15"
  };

  // Los convierte a tu objeto de dominio (camelCase)
  const props: ContractProps = {
    id: entity.id,
    nombreColaborador: entity.nombre_colaborador,
    rutSociedad: entity.rut_sociedad,
    contractType: entity.contract_type as ContractType,
    startDate: entity.start_date
  };

  return Contract.fromPersistence(props);
}
```

### **`toEntity()`** - De Aplicación → Base de Datos

```typescript
private toEntity(contract: Contract): Partial<ContractEntity> {
  // Tu objeto de dominio
  const contract = {
    id: "uuid-123",
    nombreColaborador: "Juan Pérez",
    rutSociedad: "12345678-9",
    contractType: ContractType.INDEFINIDO
  };

  // Lo convierte para MySQL
  return {
    id: contract.id,
    nombre_colaborador: contract.nombreColaborador,
    rut_sociedad: contract.rutSociedad,
    contract_type: contract.contractType,
    start_date: contract.startDate
  };
}
```

## 🎯 Ejemplos Prácticos

### **Buscar por RUT de Sociedad**

```typescript
async findByRutSociedad(rut: string): Promise<Contract[]> {
  const entities = await this.repository.find({
    where: { rutSociedad: rut },
    order: { createdAt: 'DESC' }
  });
  
  return entities.map(entity => this.toDomain(entity));
}

// USO:
const contratos = await contractRepository.findByRutSociedad("76543210-K");
contratos.forEach(c => console.log(c.nombreColaborador));
```

### **Buscar Contratos que Expiran Pronto**

```typescript
async findExpiringContracts(days: number): Promise<Contract[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const entities = await this.repository
    .createQueryBuilder('contract')
    .where('contract.end_date <= :date', { date: futureDate })
    .andWhere('contract.status = :status', { status: 'active' })
    .orderBy('contract.end_date', 'ASC')
    .getMany();
    
  return entities.map(entity => this.toDomain(entity));
}

// USO:
const expiranEn30Dias = await contractRepository.findExpiringContracts(30);
```

### **Contar Contratos por Tipo**

```typescript
async countByType(type: ContractType): Promise<number> {
  return await this.repository.count({
    where: { contractType: type }
  });
}

// USO:
const cantidadIndefinidos = await contractRepository.countByType(ContractType.INDEFINIDO);
console.log(`Tienes ${cantidadIndefinidos} contratos indefinidos`);
```

## ✅ Buenas Prácticas

### **1. Nombres Descriptivos**
```typescript
// ❌ Malo
findByDate(date: Date): Promise<Contract[]>

// ✅ Bueno  
findContractsEndingBefore(date: Date): Promise<Contract[]>
```

### **2. Manejo de Errores**
```typescript
async findById(id: string): Promise<Contract | null> {
  try {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  } catch (error) {
    console.error('Error finding contract:', error);
    throw new Error('Failed to find contract');
  }
}
```

### **3. Validaciones**
```typescript
async save(contract: Contract): Promise<Contract> {
  if (!contract.id) {
    throw new Error('Contract must have an ID');
  }
  
  const entity = this.toEntity(contract);
  const saved = await this.repository.save(entity);
  return this.toDomain(saved);
}
```

## 🚫 Qué NO Hacer

### **❌ Lógica de Negocio en Repository**
```typescript
// MALO - El repository no debe tener lógica de negocio
async calculateSalaryBonus(contract: Contract): Promise<number> {
  if (contract.contractType === ContractType.INDEFINIDO) {
    return contract.salary * 0.15; // ❌ Esto va en el dominio
  }
  return 0;
}
```

### **❌ Consultas Complejas con Joins**
```typescript
// MALO - Demasiado complejo para un repository
async getContractWithUserAndDepartmentAndManager(id: string) {
  // ❌ Esto debería ser un use case que use múltiples repositories
}
```

## 🧪 Testing

### **Mock para Tests**
```typescript
// Mock simple para testing
class MockContractRepository implements ContractRepository {
  private contracts: Contract[] = [];
  
  async save(contract: Contract): Promise<Contract> {
    this.contracts.push(contract);
    return contract;
  }
  
  async findById(id: string): Promise<Contract | null> {
    return this.contracts.find(c => c.id === id) || null;
  }
  
  // Más métodos...
}

// En tus tests
const mockRepo = new MockContractRepository();
const useCase = new CreateContractUseCase(mockRepo);
```

## 📋 Resumen

### **Repository = Traductor**
- 🔄 Convierte objetos ↔ filas de tabla
- 💾 Maneja TODAS las operaciones de base de datos  
- 🧹 Mantiene el código limpio y separado
- 🔧 Permite cambiar de base de datos fácilmente

### **Responsabilidades:**
- ✅ **SÍ**: CRUD operations, queries simples, conversiones
- ❌ **NO**: Lógica de negocio, validaciones complejas, cálculos

### **Flujo Típico:**
```
Controller → Use Case → Repository → Database
    ↓          ↓           ↓
   DTO    →  Domain   →  Entity
```

¡Ahora ya sabes cómo usar los repositories! 🚀

## 📞 ¿Dudas?

Si tienes preguntas sobre repositories:
1. Revisa los ejemplos arriba
2. Mira el código de `TypeOrmContractRepository`
3. Pregunta al equipo

**Recuerda**: El repository es solo un traductor, ¡mantenlo simple! 😊