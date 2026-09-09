import { DocumentRepository } from '../repositories/document.repository';
import { Document } from '../entities/document.entity';
import { DocumentStatus } from '../value-objects/document-enums';
import { NotFoundError } from '@shared/domain/errors';

export class GetDocumentByIdUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(id: string): Promise<Document> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new NotFoundError('Documento', id);
    }
    return document;
  }
}

export class GetAllDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(groupId?: number, filters?: {
    contractId?: string;
    colaboratorId?: string;
    requiredForContract?: boolean;
    requiredForColaborator?: boolean;
    status?: DocumentStatus | DocumentStatus[];
  }): Promise<Document[]> {
    return await this.documentRepository.findAll(groupId, filters);
  }
}

export class GetDocumentsByContractIdUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(contractId: string): Promise<Document[]> {
    return await this.documentRepository.findByContractId(contractId);
  }
}

export class GetDocumentsByTypeAndSubtypeIdUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(typeId: string, subtypeId: string): Promise<Document[]> {
    return await this.documentRepository.findByTypeAndSubtypeId(typeId, subtypeId);
  }
}

export class GetDocumentsByColaboratorIdUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(colaboratorId: string): Promise<Document[]> {
    return await this.documentRepository.findByColaboratorIds([colaboratorId]);
  }
}

export class GetExpiredDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(): Promise<Document[]> {
    return await this.documentRepository.findExpiredDocuments();
  }
}

export class GetExpiringDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  public async execute(days: number): Promise<Document[]> {
    return await this.documentRepository.findExpiringDocuments(days);
  }
}
