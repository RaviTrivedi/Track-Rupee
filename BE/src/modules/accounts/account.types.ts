import type { AccountType } from '../../generated/prisma/client';

export interface CreateAccountInput {
  name: string;
  type: Exclude<AccountType, 'CARD'>;
  openingBalance?: string;
}
export interface UpdateAccountInput { name: string; type?: Exclude<AccountType, 'CARD'>; openingBalance?: string }
