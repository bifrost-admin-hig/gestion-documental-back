import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToColaborators1780333159051 implements MigrationInterface {
  name = 'AddUserIdToColaborators1780333159051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable user_id column on colaborators (0..1 side)
    await queryRunner.query(`
      ALTER TABLE \`colaborators\`
      ADD COLUMN \`user_id\` varchar(36) NULL
    `);

    // Unique constraint ensures each user can be linked to at most one colaborator
    await queryRunner.query(`
      ALTER TABLE \`colaborators\`
      ADD CONSTRAINT \`UQ_colaborators_user_id\` UNIQUE (\`user_id\`)
    `);

    // Foreign key — SET NULL on user deletion so colaborator record survives
    await queryRunner.query(`
      ALTER TABLE \`colaborators\`
      ADD CONSTRAINT \`FK_colaborators_user_id\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`colaborators\`
      DROP FOREIGN KEY \`FK_colaborators_user_id\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`colaborators\`
      DROP INDEX \`UQ_colaborators_user_id\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`colaborators\`
      DROP COLUMN \`user_id\`
    `);
  }
}

