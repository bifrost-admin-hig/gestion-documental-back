import { UserSignature } from '../entities/user-signature.entity';

export interface UserSignatureRepository {
  findByUserId(userId: string): Promise<UserSignature | null>;
  findByColaboratorId(colaboratorId: string): Promise<UserSignature | null>;
  upsertForUser(userId: string, fileId: string): Promise<UserSignature>;
  upsertForColaborator(colaboratorId: string, fileId: string): Promise<UserSignature>;
}
