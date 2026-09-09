import { LandingSettings } from "../entities/landing-settings.entity";

export interface UpdateLandingSettingsProps {
  phone?: string;
  email?: string;
  address?: string;
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  notificationEmails?: string[];
}

export interface LandingSettingsRepository {
  getOrCreate(): Promise<LandingSettings>;
  update(props: UpdateLandingSettingsProps): Promise<LandingSettings>;
}
