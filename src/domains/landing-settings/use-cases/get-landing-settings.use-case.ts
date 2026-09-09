import { LandingSettings } from "../entities/landing-settings.entity";
import { LandingSettingsRepository } from "../repositories/landing-settings.repository";

export class GetLandingSettingsUseCase {
  constructor(private readonly landingSettingsRepository: LandingSettingsRepository) {}

  public async execute(): Promise<LandingSettings> {
    return this.landingSettingsRepository.getOrCreate();
  }
}
