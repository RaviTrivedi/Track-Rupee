export type AccountType = 'CASH' | 'BANK' | 'WALLET';
export type LocalAccount = { id: string; name: string; type: AccountType; balance: string };
