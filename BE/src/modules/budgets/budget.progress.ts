import { Prisma, type Budget } from '../../generated/prisma/client';

/*
 * Asia/Kolkata is UTC+05:30 throughout the supported 1970–9999 range. Construct
 * UTC instants directly so host timezone and daylight-saving settings cannot
 * change which transactions belong to a budget. Date.UTC handles year rollover.
 */
export function monthBounds(month: number, year: number) {
  const offset = 330 * 60 * 1000;
  return { startsAt: new Date(Date.UTC(year, month - 1, 1) - offset), endsAt: new Date(Date.UTC(year, month, 1) - offset) };
}

// Totals across accounts can exceed individual Decimal(18,2) values.
const Decimal = Prisma.Decimal.clone({ precision: 60 });
export function budgetProgress(budget: Budget, spentValue: string) {
  const limit = new Decimal(budget.amount.toString());
  const spent = new Decimal(spentValue);
  return {
    ...budget, amount: limit.toFixed(2), limit: limit.toFixed(2), spent: spent.toFixed(2),
    remaining: limit.minus(spent).toFixed(2),
    percentageUsed: spent.dividedBy(limit).times(100).toFixed(2),
    isOverBudget: spent.greaterThan(limit),
  };
}

export async function withProgress(tx: Prisma.TransactionClient, userId: string, budgets: Budget[]) {
  if (!budgets.length) return [];
  /*
   * One set-based aggregate covers every budget on the page, including different
   * months/categories. Join predicates retain owner and half-open date boundaries.
   * No account filter: spending includes all of the user's INR accounts.
   */
  const totals = await tx.$queryRaw<Array<{ id: string; spent: string }>>(Prisma.sql`
    SELECT b."id", COALESCE(SUM(t."amount"), 0)::text AS "spent"
    FROM "Budget" b
    LEFT JOIN "Transaction" t ON t."userId" = b."userId"
      AND t."categoryId" = b."categoryId" AND t."type" = 'EXPENSE'
      AND t."occurredAt" >= b."startsAt" AND t."occurredAt" < b."endsAt"
    WHERE b."userId" = ${userId}::uuid AND b."id" IN (${Prisma.join(budgets.map((b) => Prisma.sql`${b.id}::uuid`))})
    GROUP BY b."id"
  `);
  const spent = new Map(totals.map((row) => [row.id, row.spent]));
  return budgets.map((budget) => budgetProgress(budget, spent.get(budget.id) ?? '0'));
}
