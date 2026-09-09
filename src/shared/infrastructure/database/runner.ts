import { toArray } from "@shared/utils/array";
import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

type NamedTableIndex = TableIndex & { name: string; };
export type IQueryRunner = ReturnType<typeof getRunner>;


interface Named {
  name?: string;
}
function getName<T extends string | Named>(a?: T): string | undefined {
  return typeof a === 'string' ? a : a?.name;
}
function equalNames<T extends string | Named>(a?: T, b?: T): boolean {
  return (a || b) ? getName(a) === getName(b) : false;
}

export function getRunner(queryRunner: QueryRunner) {
  const runner = {
    addColumn: (table: string, column: TableColumn | TableColumn[]) =>
      queryRunner.addColumns(table, toArray(column)),
    changeColumn: (table: string, newColumn: TableColumn, oldColumn?: TableColumn | string) =>
      queryRunner.changeColumn(table, oldColumn ?? newColumn.name, newColumn),
    createForeignKey: (table: string, foreignKey: TableForeignKey | TableForeignKey[]) =>
      queryRunner.createForeignKeys(table, toArray(foreignKey)),
    async createIndex<TI extends TableIndex>(table: string, index: TI | TI[]) {
      for (const idx of toArray(index)) {
        if (idx.name && (await runner.hasIndex(table, idx.name))) continue;
        await queryRunner.createIndex(table, idx);
      }
    },
    async createTable(table: Table, ifNotExist = true, createForeignKeys = true, createIndices = true) {
      await queryRunner.createTable(table, ifNotExist, createForeignKeys, createIndices);
    },
    async dropColumn(table: string, columns: string | string[], withConstraints: boolean = true) {
      for (const column of toArray(columns)) {
        if (withConstraints) await runner.dropConstraint(table, column);
        if (await runner.hasColumn(table, column)) await queryRunner.dropColumn(table, column);
      }
    },
    async dropConstraint(table: string, names: string | string[]) {
      await runner.dropForeignKeyByField(table, names);
      await runner.dropIndexByField(table, names);
    },
    /** Puede ser un campo a buscar, una key o una lista de keys para eliminar las constraints. */
    async dropForeignKey(table: string, foreignKeyOrName: TableForeignKey | TableForeignKey[] | string | string[]) {
      for (const fk of toArray(foreignKeyOrName)) await queryRunner.dropForeignKey(table, fk);
    },
    /** Puede ser un campo a buscar, una key o una lista de keys para eliminar las constraints. */
    async dropForeignKeyByField(table: string, field: string | string[]) {
      const tbl = await runner.getTable(table);
      const foreignKeys = toArray(field).flatMap(f => tbl.foreignKeys.filter(fk => fk.columnNames.includes(f)));
      return runner.dropForeignKey(table, foreignKeys);
    },
    async dropIndex(table: string, index: string | TableIndex | (string | TableIndex)[]) {
      for (const idx of toArray(index)) {
        if (await runner.hasIndex(table, idx)) await queryRunner.dropIndex(table, idx);
      }
    },
    /** Puede ser un campo a buscar, un index o una lista de indices para eliminar las constraints. */
    async dropIndexByField<F extends string | NamedTableIndex>(table: string, field: F | F[]) {
      const tbl = await runner.getTable(table);
      return runner.dropIndex(table, toArray(field).flatMap(
        f => tbl.indices.filter(idx => idx.columnNames.includes(f)),
      ));
    },
    async dropTable(table: string, ifExist = true, dropForeignKeys = true, dropIndices = true) {
      await queryRunner.dropTable(table, ifExist, dropForeignKeys, dropIndices);
    },
    findColumnByName: (table: string, name: string | TableColumn) =>
      runner.withTable(table, t => t.columns.find(c => equalNames(c, name))),
    async getTable(tablePath: string): Promise<Table> {
      const table = await queryRunner.getTable(tablePath);
      if (!table) throw new Error(`Table ${tablePath} not found`);
      return table;
    },
    hasColumn: (table: string, columns: (string | TableColumn) | (string | TableColumn)[]) =>
      runner.withTable(table, t => toArray(columns).every(
        c => t.columns.some(c2 => equalNames(c2, c)),
      )),
    hasForeignKey: (table: string, name: string | TableForeignKey | undefined) =>
      runner.withTable(table, t => t.foreignKeys.some(fk => equalNames(fk, name))),
    hasIndex: (table: string, name: string | TableIndex) =>
      runner.withTable(table, table => table.indices.some(idx => equalNames(idx, name))),
    isNullable: (table: string, column: string) =>
      runner.withTable(table, table => table.columns.find(c => c.name === column)?.isNullable ?? false),
    withTable: async <R>(table: string, callback: (table: Table) => R): Promise<R> =>
      callback(await runner.getTable(table)),
  };

  return new Proxy(runner, {
    get(target, prop) {
      if (prop in target) return target[prop as keyof typeof target];
      return queryRunner[prop as keyof typeof queryRunner];
    },
  }) as Omit<QueryRunner, keyof typeof runner> & typeof runner;
}

export abstract class ImprovedRunner implements MigrationInterface {
  async up(baseRunner: QueryRunner) {
    await this.onUp?.(getRunner(baseRunner));
  }
  async down(baseRunner: QueryRunner) {
    await this.onDown?.(getRunner(baseRunner));
  }
  abstract onUp(queryRunner: IQueryRunner): Promise<void>;
  abstract onDown(queryRunner: IQueryRunner): Promise<void>;
}
