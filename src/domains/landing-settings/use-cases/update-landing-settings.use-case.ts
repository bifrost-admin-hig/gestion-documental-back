import { LandingSettings } from "../entities/landing-settings.entity";
import { LandingSettingsRepository, UpdateLandingSettingsProps } from "../repositories/landing-settings.repository";

export class UpdateLandingSettingsUseCase {
  constructor(private readonly landingSettingsRepository: LandingSettingsRepository) {}

  public async execute(props: UpdateLandingSettingsProps): Promise<LandingSettings> {
    return this.landingSettingsRepository.update(props);
  }
}
