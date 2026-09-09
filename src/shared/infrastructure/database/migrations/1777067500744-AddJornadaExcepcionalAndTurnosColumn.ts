import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddJornadaExcepcionalAndTurnosColumn1777067500744 implements MigrationInterface {
  name = 'AddJornadaExcepcionalAndTurnosColumn1777067500744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`contracts\` MODIFY COLUMN \`jornada_trabajo\` ENUM('completa','parcial','turno','especial','excepcional') NOT NULL DEFAULT 'completa'`,
    );

    const table = await queryRunner.getTable('contracts');
    if (table && !table.findColumnByName('turnos')) {
      await queryRunner.addColumn(
        'contracts',
        new TableColumn({
          name: 'turnos',
          type: 'varchar',
          length: '255',
          isNullable: true,
          default: null,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contracts');
    if (table && table.findColumnByName('turnos')) {
      await queryRunner.dropColumn('contracts', 'turnos');
    }

    await queryRunner.query(
      `ALTER TABLE \`contracts\` MODIFY COLUMN \`jornada_trabajo\` ENUM('completa','parcial','turno','especial') NOT NULL DEFAULT 'completa'`,
    );
  }
}

