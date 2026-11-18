import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  accountBalance,
  type Category as CalcCategory,
  type Transaction as CalcTransaction,
} from "@/modules/finance/calc";

const transactionKinds = ["IN", "OUT", "TRANSFER"] as const;
const transactionStatuses = ["POSTED", "VOID"] as const;
const categoryKinds = ["INCOME", "EXPENSE", "RECEIVABLE", "EQUITY"] as const;

function assertOneOf<T extends string>(
  value: string,
  options: readonly T[],
  label: string,
): T {
  const found = options.find((option) => option === value);
  if (!found) {
    throw new Error(`Nilai ${label} tidak dikenal: ${value}`);
  }
  return found;
}

function toCalcTransaction(transaction: {
  id: string;
  date: Date;
  type: string;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  status: string;
}): CalcTransaction {
  return {
    ...transaction,
    type: assertOneOf(transaction.type, transactionKinds, "jenis transaksi"),
    status: assertOneOf(transaction.status, transactionStatuses, "status transaksi"),
  };
}

function toCalcCategory(category: { id: string; kind: string; name?: string }): CalcCategory {
  return {
    ...category,
    kind: assertOneOf(category.kind, categoryKinds, "tipe kategori"),
  };
}

export async function getFinanceSnapshot(orgId: string) {
  const [organization, accounts, categoryRows, transactionRows, parties] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: orgId }, select: { name: true } }),
    db.account.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    db.transaction.findMany({
      where: { orgId },
      include: { account: true, toAccount: true, category: true, party: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.party.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
  ]);
  const categories = categoryRows.map(toCalcCategory);
  const transactions = transactionRows.map(toCalcTransaction);

  return {
    organizationName: organization.name,
    accounts,
    categories,
    transactions,
    parties,
    transactionRows,
  };
}

export async function getBookPage(
  orgId: string,
  range: { start: Date; end: Date },
  page = 1,
  filters: { accountId?: string; categoryId?: string; partyId?: string; search?: string } = {},
) {
  const { start, end } = range;
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.getTime() >= end.getTime()
  ) {
    throw new Error("Rentang periode tidak valid.");
  }
  const and: Prisma.TransactionWhereInput[] = [];
  if (filters.accountId) {
    and.push({ OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] });
  }
  if (filters.categoryId) and.push({ categoryId: filters.categoryId });
  if (filters.partyId) and.push({ partyId: filters.partyId });
  if (filters.search) {
    and.push({
      OR: [
        { description: { contains: filters.search } },
        { refNo: { contains: filters.search } },
        { party: { is: { name: { contains: filters.search } } } },
      ],
    });
  }

  const where = {
    orgId,
    date: { gte: start, lt: end },
    ...(and.length ? { AND: and } : {}),
  };

  const [transactions, total, accounts, categoryRows, parties, openingRows, balanceRows] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { account: true, toAccount: true, category: true, party: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * 50,
      take: 50,
    }),
    db.transaction.count({ where }),
    db.account.findMany({ where: { orgId } }),
    db.category.findMany({ where: { orgId } }),
    db.party.findMany({ where: { orgId, isActive: true }, orderBy: { name: "asc" } }),
    filters.accountId
      ? db.transaction.findMany({
          where: {
            orgId,
            status: "POSTED",
            date: { lt: start },
            OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }],
          },
          select: {
            id: true,
            date: true,
            type: true,
            amount: true,
            accountId: true,
            toAccountId: true,
            categoryId: true,
            status: true,
          },
        })
      : db.transaction.findMany({
          where: { orgId, status: "POSTED", date: { lt: start } },
          select: {
            id: true,
            date: true,
            type: true,
            amount: true,
            accountId: true,
            toAccountId: true,
            categoryId: true,
            status: true,
          },
        }),
    db.transaction.findMany({
      where: {
        orgId,
        date: { gte: start, lt: end },
        ...(filters.accountId
          ? { OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] }
          : {}),
      },
      select: {
        id: true,
        date: true,
        type: true,
        amount: true,
        accountId: true,
        toAccountId: true,
        categoryId: true,
        status: true,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const calcTransactions = openingRows.map(toCalcTransaction);
  const selectedAccount = filters.accountId
    ? accounts.find((account) => account.id === filters.accountId)
    : undefined;
  if (filters.accountId && !selectedAccount) {
    throw new Error("Akun yang dipilih tidak ditemukan.");
  }
  const openingDate = new Date(start.getTime() - 1);
  const openingBalance = selectedAccount
    ? accountBalance(selectedAccount, calcTransactions, openingDate)
    : accounts.reduce(
        (totalBalance, account) =>
          totalBalance + accountBalance(account, calcTransactions, openingDate),
        0,
      );
  const balanceById: Record<string, number> = {};
  let runningBalance = openingBalance;
  for (const transaction of balanceRows.map(toCalcTransaction)) {
    if (transaction.status === "POSTED" && selectedAccount) {
        if (transaction.accountId === selectedAccount.id) {
          runningBalance += transaction.type === "IN" ? transaction.amount : -transaction.amount;
        } else if (transaction.type === "TRANSFER" && transaction.toAccountId === selectedAccount.id) {
          runningBalance += transaction.amount;
        }
    } else if (transaction.status === "POSTED" && transaction.type === "IN") {
        runningBalance += transaction.amount;
    } else if (transaction.status === "POSTED" && transaction.type === "OUT") {
        runningBalance -= transaction.amount;
    }
    balanceById[transaction.id] = runningBalance;
  }

  return {
    transactions: transactions.map((transaction) => ({
      ...transaction,
      type: assertOneOf(transaction.type, transactionKinds, "jenis transaksi"),
      status: assertOneOf(transaction.status, transactionStatuses, "status transaksi"),
    })),
    accounts,
    categories: categoryRows,
    parties,
    openingBalance,
    balanceById,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 50)),
  };
}
