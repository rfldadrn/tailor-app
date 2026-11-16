import { describe, expect, it } from "vitest";
import {
  balanceSheet,
  type Account,
  type Category,
  type Transaction,
} from "./index";

const accounts: Account[] = [
  { id: "cash", openingBalance: 1_000_000 },
  { id: "bank", openingBalance: 2_000_000 },
];
const categories: Category[] = [
  { id: "income", kind: "INCOME" },
  { id: "expense", kind: "EXPENSE" },
  { id: "receivable", kind: "RECEIVABLE" },
  { id: "equity", kind: "EQUITY" },
];

function transaction(
  id: string,
  type: Transaction["type"],
  amount: number,
  accountId: string,
  categoryId: string | null,
  toAccountId: string | null = null,
  status: Transaction["status"] = "POSTED",
): Transaction {
  return {
    id,
    type,
    amount,
    accountId,
    categoryId,
    toAccountId,
    status,
    date: new Date("2026-10-15T00:00:00.000Z"),
  };
}

describe("balanceSheet", () => {
  it("balances across income, costs, receivables, transfers, equity, and voids", () => {
    const transactions = [
      transaction("income-1", "IN", 500_000, "cash", "income"),
      transaction("expense-1", "OUT", 120_000, "cash", "expense"),
      transaction("loan", "OUT", 200_000, "cash", "receivable"),
      transaction("repayment", "IN", 50_000, "cash", "receivable"),
      transaction("transfer", "TRANSFER", 400_000, "bank", null, "cash"),
      transaction("capital", "IN", 300_000, "bank", "equity"),
      transaction("withdrawal", "OUT", 80_000, "cash", "equity"),
      transaction("void", "OUT", 1_000_000, "cash", "expense", null, "VOID"),
    ];

    expect(
      balanceSheet(accounts, transactions, categories, new Date("2026-10-31T23:59:59.999Z")),
    ).toEqual({ assets: 3_600_000, equity: 3_600_000, difference: 0 });
  });
});
