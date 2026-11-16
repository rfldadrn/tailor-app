export type Account = {
  id: string;
  openingBalance: number;
};

export type Category = {
  id: string;
  kind: "INCOME" | "EXPENSE" | "RECEIVABLE" | "EQUITY";
  name?: string;
};

export type Transaction = {
  id: string;
  date: Date;
  type: "IN" | "OUT" | "TRANSFER";
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  status: "POSTED" | "VOID";
};

function isThroughDate(date: Date, until: Date): boolean {
  return date.getTime() <= until.getTime();
}

function signedAmount(
  transaction: Transaction,
  accountId: string,
): number {
  if (transaction.accountId === accountId) {
    return transaction.type === "IN" ? transaction.amount : -transaction.amount;
  }
  if (
    transaction.type === "TRANSFER" &&
    transaction.toAccountId === accountId
  ) {
    return transaction.amount;
  }
  return 0;
}

export function accountBalance(
  account: Account,
  transactions: Transaction[],
  until: Date,
): number {
  return (
    account.openingBalance +
    transactions
      .filter(
        (transaction) =>
          transaction.status === "POSTED" &&
          isThroughDate(transaction.date, until),
      )
      .reduce(
        (balance, transaction) =>
          balance + signedAmount(transaction, account.id),
        0,
      )
  );
}

export function profitForPeriod(
  transactions: Transaction[],
  categories: Category[],
  from: Date,
  until: Date,
): number {
  const categoryKinds = new Map(
    categories.map((category) => [category.id, category.kind]),
  );

  return transactions.reduce((profit, transaction) => {
    if (
      transaction.status !== "POSTED" ||
      transaction.date < from ||
      !isThroughDate(transaction.date, until)
    ) {
      return profit;
    }

    const kind = transaction.categoryId
      ? categoryKinds.get(transaction.categoryId)
      : undefined;
    if (kind === "INCOME" && transaction.type === "IN") {
      return profit + transaction.amount;
    }
    if (kind === "EXPENSE" && transaction.type === "OUT") {
      return profit - transaction.amount;
    }
    return profit;
  }, 0);
}

export function employeeReceivable(
  transactions: Transaction[],
  categories: Category[],
  until: Date,
): number {
  const categoryKinds = new Map(
    categories.map((category) => [category.id, category.kind]),
  );

  return transactions.reduce((amount, transaction) => {
    if (
      transaction.status !== "POSTED" ||
      !isThroughDate(transaction.date, until) ||
      !transaction.categoryId ||
      categoryKinds.get(transaction.categoryId) !== "RECEIVABLE"
    ) {
      return amount;
    }
    return amount + (transaction.type === "OUT" ? transaction.amount : -transaction.amount);
  }, 0);
}

export function equityContributions(
  transactions: Transaction[],
  categories: Category[],
  until: Date,
): number {
  const categoryKinds = new Map(
    categories.map((category) => [category.id, category.kind]),
  );

  return transactions.reduce((amount, transaction) => {
    if (
      transaction.status !== "POSTED" ||
      !isThroughDate(transaction.date, until) ||
      !transaction.categoryId ||
      categoryKinds.get(transaction.categoryId) !== "EQUITY"
    ) {
      return amount;
    }
    return amount + (transaction.type === "IN" ? transaction.amount : -transaction.amount);
  }, 0);
}

export function balanceSheet(
  accounts: Account[],
  transactions: Transaction[],
  categories: Category[],
  until: Date,
): { assets: number; equity: number; difference: number } {
  const assets =
    accounts.reduce(
      (total, account) => total + accountBalance(account, transactions, until),
      0,
    ) + employeeReceivable(transactions, categories, until);

  const openingCapital = accounts.reduce(
    (total, account) => total + account.openingBalance,
    0,
  );
  const equity =
    openingCapital +
    equityContributions(transactions, categories, until) +
    profitForPeriod(
      transactions,
      categories,
      new Date(0),
      new Date(until.getTime() + 1),
    );

  return { assets, equity, difference: assets - equity };
}
