import { ContractReviewer, CreateContractReviewerProps, UpdateContractReviewerProps } from '../entities/contract-reviewer.entity';

export interface ContractReviewerRepository {
  findById(id: string): Promise<ContractReviewer | null>;
  findByContractAndUser(contractId: string, userId: string): Promise<ContractReviewer | null>;
  findByContract(contractId: string): Promise<ContractReviewer[]>;
  findByUser(userId: string): Promise<ContractReviewer[]>;
  findActiveByContract(contractId: string): Promise<ContractReviewer[]>;
  findByContractIds(contractIds: string[]): Promise<Map<string, ContractReviewer[]>>;
  save(props: CreateContractReviewerProps): Promise<ContractReviewer>;
  update(props: UpdateContractReviewerProps): Promise<ContractReviewer>;
  delete(id: string): Promise<void>;
  deleteByContractAndUser(contractId: string, userId: string): Promise<void>;
}
