import { DocumentHistoryRepository } from '../repositories/document-history.repository';
import { DocumentHistory } from '../entities/document-history.entity';

export class GetDocumentHistoryUseCase {
  constructor(private readonly documentHistoryRepository: DocumentHistoryRepository) {}

  public async getById(id: string): Promise<DocumentHistory | null> {
    return await this.documentHistoryRepository.findById(id);
  }

  public async getByDocumentId(documentId: string): Promise<DocumentHistory[]> {
    return await this.documentHistoryRepository.findByDocumentId(documentId);
  }

  public async getAll(): Promise<DocumentHistory[]> {
    return await this.documentHistoryRepository.findAll();
  }

  public async getByUpdatedBy(updatedBy: string): Promise<DocumentHistory[]> {
    return await this.documentHistoryRepository.findByUpdatedBy(updatedBy);
  }
}
