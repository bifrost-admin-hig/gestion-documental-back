import { Request, Response } from 'express';
import { GetLandingSettingsUseCase } from '@domains/landing-settings/use-cases/get-landing-settings.use-case';
import { UpdateLandingSettingsUseCase } from '@domains/landing-settings/use-cases/update-landing-settings.use-case';
import { SubmitLandingContactUseCase } from '@domains/landing-settings/use-cases/submit-landing-contact.use-case';
import { asyncHandler } from '@shared/middleware/validation';

export class LandingSettingsController {
  constructor(
    private readonly getLandingSettingsUseCase: GetLandingSettingsUseCase,
    private readonly updateLandingSettingsUseCase: UpdateLandingSettingsUseCase,
    private readonly submitLandingContactUseCase: SubmitLandingContactUseCase,
  ) {}

  public getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await this.getLandingSettingsUseCase.execute();
    res.status(200).json({ success: true, data: settings.toPublicJSON() });
  });

  public getSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await this.getLandingSettingsUseCase.execute();
    res.status(200).json({ success: true, data: settings.toJSON() });
  });

  public updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.updateLandingSettingsUseCase.execute(req.body);
    res.status(200).json({
      success: true,
      data: settings.toJSON(),
      message: 'Landing settings updated successfully',
    });
  });

  public submitContactForm = asyncHandler(async (req: Request, res: Response) => {
    await this.submitLandingContactUseCase.execute(req.body);
    res.status(201).json({ success: true, message: 'Contact form submitted successfully' });
  });
}
