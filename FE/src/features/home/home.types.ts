export type CategoryType = 'INCOME' | 'EXPENSE';

export type HomeCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export type HomeState = {
  accountCount: number;
  balance: string;
  incomeCategories: HomeCategory[];
  expenseCategories: HomeCategory[];
  recentTransactions: never[];
  budgets: never[];
};

export const initialHomeState: HomeState = {
  accountCount: 0,
  balance: '0.00',
  incomeCategories: [
    { id: 'income-salary', name: 'Salary', type: 'INCOME', icon: 'work', color: '#99B7DD' },
    { id: 'income-freelance', name: 'Freelance', type: 'INCOME', icon: 'laptop', color: '#8BCBB8' },
    { id: 'income-business', name: 'Business', type: 'INCOME', icon: 'storefront', color: '#F7D44C' },
    { id: 'income-investment', name: 'Investment', type: 'INCOME', icon: 'trending-up', color: '#F6ECC9' },
    { id: 'income-gift', name: 'Gift', type: 'INCOME', icon: 'card-giftcard', color: '#F2B8A1' },
    { id: 'income-other', name: 'Other Income', type: 'INCOME', icon: 'more-horiz', color: '#D8C7E8' },
  ],
  expenseCategories: [
    { id: 'expense-food', name: 'Food', type: 'EXPENSE', icon: 'restaurant', color: '#F6ECC9' },
    { id: 'expense-rent', name: 'Rent', type: 'EXPENSE', icon: 'home', color: '#99B7DD' },
    { id: 'expense-travel', name: 'Travel', type: 'EXPENSE', icon: 'flight', color: '#8BCBB8' },
    { id: 'expense-shopping', name: 'Shopping', type: 'EXPENSE', icon: 'shopping-bag', color: '#F7D44C' },
    { id: 'expense-bills', name: 'Bills', type: 'EXPENSE', icon: 'receipt-long', color: '#F2B8A1' },
    { id: 'expense-health', name: 'Health', type: 'EXPENSE', icon: 'favorite', color: '#D8C7E8' },
    { id: 'expense-education', name: 'Education', type: 'EXPENSE', icon: 'school', color: '#C7D7EE' },
    { id: 'expense-entertainment', name: 'Entertainment', type: 'EXPENSE', icon: 'movie', color: '#F5C7A9' },
    { id: 'expense-emi', name: 'EMI', type: 'EXPENSE', icon: 'payments', color: '#B9D5CA' },
    { id: 'expense-other', name: 'Other Expense', type: 'EXPENSE', icon: 'more-horiz', color: '#D8C7E8' },
  ],
  recentTransactions: [],
  budgets: [],
};
