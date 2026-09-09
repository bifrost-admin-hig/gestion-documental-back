import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { ValidationError } from '@shared/domain/errors';

export interface GetSignatureSmsPhoneResult {
  phoneNumber: string;
}

export class GetSignatureSmsPhoneUseCase {
  constructor(private readonly colaboratorRepository: ColaboratorRepository) {}

  async execute(userId: string): Promise<GetSignatureSmsPhoneResult> {
    const colaborator = await this.colaboratorRepository.findByUserId(userId);

    if (!colaborator || !colaborator.telefono?.trim()) {
      throw new ValidationError(
        'El usuario no tiene un colaborador con telefono registrado para firma por SMS.',
      );
    }

    return {
      phoneNumber: colaborator.telefono,
    };
  }
}
