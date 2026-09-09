import { EntityUtils } from "@shared/utils/common";
import { ValidationError } from "@shared/domain/errors";

export const LANDING_SETTINGS_ID = "default";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LandingSettingsProps {
  id?: string;
  phone?: string;
  email?: string;
  address?: string;
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  notificationEmails?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LandingSettingsJson {
  id: string;
  phone?: string;
  email?: string;
  address?: string;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  notificationEmails: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LandingContactInfoJson {
  phone?: string;
  email?: string;
  address?: string;
}

export class LandingSettings {
  id: string;
  phone?: string;
  email?: string;
  address?: string;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  notificationEmails: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LandingSettingsProps) {
    LandingSettings.validate(props);
    EntityUtils.assign(this as LandingSettings, {
      ...props,
      id: props.id || LANDING_SETTINGS_ID,
      showPhone: props.showPhone ?? true,
      showEmail: props.showEmail ?? true,
      showAddress: props.showAddress ?? true,
      notificationEmails: props.notificationEmails || [],
    }, {
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  private static validate(props: LandingSettingsProps): void {
    if (props.email && !EMAIL_REGEX.test(props.email)) {
      throw new ValidationError('Invalid contact email', 'email');
    }
    for (const notificationEmail of props.notificationEmails || []) {
      if (!EMAIL_REGEX.test(notificationEmail)) {
        throw new ValidationError(`Invalid notification email: ${notificationEmail}`, 'notificationEmails');
      }
    }
  }

  recipientEmails(): string[] {
    if (this.notificationEmails.length) return this.notificationEmails;
    return this.email ? [this.email] : [];
  }

  toJSON(): LandingSettingsJson {
    return {
      id: this.id,
      phone: this.phone,
      email: this.email,
      address: this.address,
      showPhone: this.showPhone,
      showEmail: this.showEmail,
      showAddress: this.showAddress,
      notificationEmails: this.notificationEmails,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toPublicJSON(): LandingContactInfoJson {
    return {
      phone: this.showPhone ? this.phone : undefined,
      email: this.showEmail ? this.email : undefined,
      address: this.showAddress ? this.address : undefined,
    };
  }
}
