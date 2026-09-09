import { DocumentHistoryRepository } from '../repositories/document-history.repository';
import { DocumentHistory, DocumentHistoryProps } from '../entities/document-history.entity';

export class CreateDocumentHistoryUseCase {
  constructor(private readonly documentHistoryRepository: DocumentHistoryRepository) {}

  public async execute(request: DocumentHistoryProps): Promise<DocumentHistory> {
    const history = new DocumentHistory(request);
    return await this.documentHistoryRepository.save(history);
  }
}
