import { Signature } from '../entities/signature.entity';

export interface SignatureRepository {
  findById(id: string): Promise<Signature | null>;
  findByDocumentId(documentId: string): Promise<Signature[]>;
  findLatestByDocumentId(documentId: string): Promise<Signature | null>;
  findByTokenHash(tokenHash: string): Promise<Signature | null>;
  findByDocumentIdAndTokenHash(documentId: string, tokenHash: string): Promise<Signature | null>;
  save(signature: Signature): Promise<Signature>;
  update(signature: Signature): Promise<Signature>;
}
