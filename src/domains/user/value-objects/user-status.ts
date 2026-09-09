export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export const isValidUserStatus = (status?: string | null): status is UserStatus => (
  Object.values(UserStatus).includes(status as UserStatus)
);
