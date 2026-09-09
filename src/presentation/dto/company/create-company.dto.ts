export interface CreateCompanyDto {
  name: string;
  taxId: string;
  address?: string;
  phone?: string;
  email?: string;
  groupId: number;
}
