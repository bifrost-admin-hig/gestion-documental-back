import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MakeNombreColaboradorNullable1775759241513 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'contracts',
      'nombre_colaborador',
      new TableColumn({
        name: 'nombre_colaborador',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'contracts',
      'nombre_colaborador',
      new TableColumn({
        name: 'nombre_colaborador',
        type: 'varchar',
        length: '255',
        isNullable: false,
      }),
    );
  }
}
