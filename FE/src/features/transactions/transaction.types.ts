export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionDraft = { type: TransactionType; amount: string; accountId: string; categoryId: string; date: string; note: string };
export type MockTransaction = TransactionDraft & { id: string; categoryName: string; categoryIcon: string; accountName: string };
