import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LandingSettings, LANDING_SETTINGS_ID } from '@domains/landing-settings/entities/landing-settings.entity';

@Entity('landing_settings')
export class LandingSettingsEntity {
  @PrimaryColumn({ type: 'varchar', length: 20, default: LANDING_SETTINGS_ID })
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string;

  @Column({ name: 'show_phone', type: 'boolean', default: true })
  showPhone!: boolean;

  @Column({ name: 'show_email', type: 'boolean', default: true })
  showEmail!: boolean;

  @Column({ name: 'show_address', type: 'boolean', default: true })
  showAddress!: boolean;

  @Column({ name: 'notification_emails', type: 'json', nullable: true })
  notificationEmails?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static toDomain(entity: LandingSettingsEntity): LandingSettings {
    return new LandingSettings({
      id: entity.id,
      phone: entity.phone,
      email: entity.email,
      address: entity.address,
      showPhone: entity.showPhone,
      showEmail: entity.showEmail,
      showAddress: entity.showAddress,
      notificationEmails: entity.notificationEmails || [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
