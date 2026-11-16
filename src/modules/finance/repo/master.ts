import { db } from "@/lib/db";

export async function getAccounts(orgId: string) {
  return db.account.findMany({
    where: { orgId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getCategories(orgId: string) {
  return db.category.findMany({
    where: { orgId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getParties(orgId: string) {
  return db.party.findMany({
    where: { orgId },
    orderBy: [{ isActive: "desc" }, { kind: "asc" }, { name: "asc" }],
  });
}

export async function getUsers(orgId: string) {
  return db.user.findMany({
    where: { orgId },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
    orderBy: { name: "asc" },
  });
}

export async function getPeriodLocks(orgId: string) {
  return db.periodLock.findMany({
    where: { orgId },
    include: { lockedBy: { select: { name: true } } },
    orderBy: { month: "desc" },
  });
}

export async function getTransactionsForExport(
  orgId: string,
  month: string,
  filters: { accountId?: string; categoryId?: string; partyId?: string; search?: string } = {},
) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const clauses = [];
  if (filters.accountId) {
    clauses.push({ OR: [{ accountId: filters.accountId }, { toAccountId: filters.accountId }] });
  }
  if (filters.categoryId) clauses.push({ categoryId: filters.categoryId });
  if (filters.partyId) clauses.push({ partyId: filters.partyId });
  if (filters.search) {
    clauses.push({
      OR: [
        { description: { contains: filters.search } },
        { refNo: { contains: filters.search } },
        { party: { is: { name: { contains: filters.search } } } },
      ],
    });
  }
  return db.transaction.findMany({
    where: {
      orgId,
      date: { gte: start, lt: end },
      ...(clauses.length ? { AND: clauses } : {}),
    },
    include: { account: true, toAccount: true, category: true, party: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}
