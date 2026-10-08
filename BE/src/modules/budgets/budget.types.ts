export interface CreateBudgetInput { categoryId: string; amount: string; month: number; year: number }
export interface UpdateBudgetInput { amount: string }
export interface BudgetQuery { page: number; limit: number; month?: number; year?: number }
