import { UserSignatureRepository } from '../repositories/user-signature.repository';
import { TypeOrmFileRepository } from '@shared/infrastructure/repositories/typeorm-file.repository';

export interface SavedSignaturePreview {
  available: boolean;
  previewDataUrl?: string;
}

/** Busca la firma guardada de un usuario interno o de un colaborador y la devuelve lista para previsualizar (data URL). */
export class GetSavedSignaturePreviewUseCase {
  constructor(
    private readonly userSignatureRepository: UserSignatureRepository,
    private readonly fileRepository: TypeOrmFileRepository,
  ) {}

  async execute(params: { userId?: string; colaboratorId?: string }): Promise<SavedSignaturePreview> {
    const record = params.userId
      ? await this.userSignatureRepository.findByUserId(params.userId)
      : params.colaboratorId
        ? await this.userSignatureRepository.findByColaboratorId(params.colaboratorId)
        : null;

    if (!record) return { available: false };

    const file = await this.fileRepository.findById(record.fileId);
    if (!file) return { available: false };

    const bytes = await this.fileRepository.getContent(file);
    const mimeType = file.mimeType || 'image/png';

    return {
      available: true,
      previewDataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`,
    };
  }
}
