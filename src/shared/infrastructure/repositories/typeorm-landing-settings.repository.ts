import { Repository, DataSource } from 'typeorm';
import {
  LandingSettingsRepository,
  UpdateLandingSettingsProps,
} from '@domains/landing-settings/repositories/landing-settings.repository';
import { LandingSettings, LANDING_SETTINGS_ID } from '@domains/landing-settings/entities/landing-settings.entity';
import { LandingSettingsEntity } from '../database/entities/landing-settings.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmLandingSettingsRepository implements LandingSettingsRepository {
  private repository: Repository<LandingSettingsEntity>;

  constructor(dataSource?: DataSource) {
    const ds = dataSource || AppDataSource;
    this.repository = ds.getRepository(LandingSettingsEntity);
  }

  async getOrCreate(): Promise<LandingSettings> {
    const existing = await this.repository.findOneBy({ id: LANDING_SETTINGS_ID });
    if (existing) return LandingSettingsEntity.toDomain(existing);

    const entity = new LandingSettingsEntity();
    entity.id = LANDING_SETTINGS_ID;
    entity.notificationEmails = [];
    const saved = await this.repository.save(entity);
    return LandingSettingsEntity.toDomain(saved);
  }

  async update(props: UpdateLandingSettingsProps): Promise<LandingSettings> {
    await this.getOrCreate();
    const entity = await this.repository.findOneByOrFail({ id: LANDING_SETTINGS_ID });

    if (props.phone !== undefined) entity.phone = props.phone;
    if (props.email !== undefined) entity.email = props.email;
    if (props.address !== undefined) entity.address = props.address;
    if (props.showPhone !== undefined) entity.showPhone = props.showPhone;
    if (props.showEmail !== undefined) entity.showEmail = props.showEmail;
    if (props.showAddress !== undefined) entity.showAddress = props.showAddress;
    if (props.notificationEmails !== undefined) entity.notificationEmails = props.notificationEmails;

    // Construir la entidad de dominio primero para reutilizar sus validaciones (formato de emails).
    new LandingSettings({
      id: entity.id,
      phone: entity.phone,
      email: entity.email,
      address: entity.address,
      showPhone: entity.showPhone,
      showEmail: entity.showEmail,
      showAddress: entity.showAddress,
      notificationEmails: entity.notificationEmails,
    });

    const saved = await this.repository.save(entity);
    return LandingSettingsEntity.toDomain(saved);
  }
}
