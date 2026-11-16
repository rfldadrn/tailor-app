import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import { CashFlowChart } from "@/components/erp/cash-flow-chart";
import { PageHeader } from "@/components/erp/page-header";
import { StatStrip } from "@/components/erp/stat-strip";
import { formatDate, formatRupiah } from "@/lib/money";
import { requireUser } from "@/lib/rbac";
import {
  accountBalance,
  employeeReceivable,
  profitForPeriod,
} from "@/modules/finance/calc";
import { getFinanceSnapshot } from "@/modules/finance/repo/finance";

function monthStart(date: Date, offset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function monthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const monthFrom = monthStart(now);
  const monthUntil = now;
  const previousFrom = monthStart(now, -1);
  const previousUntil = new Date(monthFrom.getTime() - 1);
  const data = await getFinanceSnapshot(user.orgId);
  const posted = data.transactions.filter((transaction) => transaction.status === "POSTED");
  const currentIncome = posted
    .filter((transaction) => transaction.type === "IN" && transaction.date >= monthFrom && transaction.date <= monthUntil)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const currentExpense = posted
    .filter((transaction) => transaction.type === "OUT" && transaction.date >= monthFrom && transaction.date <= monthUntil)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousIncome = posted
    .filter((transaction) => transaction.type === "IN" && transaction.date >= previousFrom && transaction.date <= previousUntil)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousExpense = posted
    .filter((transaction) => transaction.type === "OUT" && transaction.date >= previousFrom && transaction.date <= previousUntil)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const currentProfit = profitForPeriod(data.transactions, data.categories, monthFrom, monthUntil);
  const previousProfit = profitForPeriod(data.transactions, data.categories, previousFrom, previousUntil);
  const totalCash = data.accounts.reduce(
    (total, account) => total + accountBalance(account, data.transactions, now),
    0,
  );
  const outstandingLoans = employeeReceivable(data.transactions, data.categories, now);
  const incomeCategories = new Map(
    data.categories.map((category) => [category.id, category.kind]),
  );
  const spendingByCategory = new Map<string, number>();
  for (const transaction of posted) {
    if (
      transaction.type === "OUT" &&
      transaction.date >= monthFrom &&
      transaction.date <= monthUntil &&
      transaction.categoryId &&
      incomeCategories.get(transaction.categoryId) === "EXPENSE"
    ) {
      spendingByCategory.set(
        transaction.categoryId,
        (spendingByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
      );
    }
  }
  const topCategories = [...spendingByCategory.entries()]
    .map(([id, amount]) => ({
      name: data.categories.find((category) => category.id === id)?.kind
        ? data.transactionRows.find((transaction) => transaction.categoryId === id)?.category?.name ?? "Kategori"
        : "Kategori",
      amount,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const start = monthStart(now, index - 5);
    const end = monthEnd(start);
    const rows = posted.filter((transaction) => transaction.date >= start && transaction.date <= end);
    return {
      month: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(start),
      masuk: rows.filter((transaction) => transaction.type === "IN").reduce((sum, row) => sum + row.amount, 0),
      keluar: rows.filter((transaction) => transaction.type === "OUT").reduce((sum, row) => sum + row.amount, 0),
    };
  });
  const recent = data.transactionRows.slice(0, 8);
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);

  return (
    <>
      <PageHeader title="Ringkasan keuangan" description={`Ikhtisar usaha untuk ${monthLabel}.`} />
      <StatStrip
        items={[
          { label: "Saldo kas", amount: totalCash, note: "Seluruh akun" },
          { label: "Penerimaan bulan ini", amount: currentIncome, tone: "positive", note: `Bulan lalu ${formatRupiah(previousIncome)}` },
          { label: "Pengeluaran bulan ini", amount: currentExpense, tone: "negative", note: `Bulan lalu ${formatRupiah(previousExpense)}` },
          { label: "Laba bulan ini", amount: currentProfit, tone: currentProfit < 0 ? "negative" : "positive", note: `Bulan lalu ${formatRupiah(previousProfit)}` },
          { label: "Kasbon beredar", amount: outstandingLoans, note: "Piutang karyawan" },
        ]}
      />
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-header">
            <h2>Penerimaan dan pengeluaran</h2>
            <span className="cell-secondary">6 bulan terakhir</span>
          </div>
          <div className="panel-body"><CashFlowChart data={chartData} /></div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>Saldo per akun</h2></div>
          <div className="panel-body">
            <div className="account-list">
              {data.accounts.map((account) => (
                <div className="account-row" key={account.id}>
                  <span>{account.name}</span>
                  <strong>{formatRupiah(accountBalance(account, data.transactions, now))}</strong>
                </div>
              ))}
            </div>
            {topCategories.length > 0 && (
              <div className="expense-categories">
                <h3>Biaya bulan ini</h3>
                <div className="category-list">
                  {topCategories.map((category) => (
                    <div className="category-row" key={category.name}>
                      <span>{category.name}</span>
                      <strong>{formatRupiah(category.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-header">
          <h2>Transaksi terakhir</h2>
          <Link className="quiet-link" href="/keuangan/buku-kas">Buka buku kas</Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Tanggal</th><th>Keterangan</th><th>Akun</th><th className="numeric">Debit</th><th className="numeric">Kredit</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recent.map((transaction) => (
                <tr className={transaction.status === "VOID" ? "is-void" : ""} key={transaction.id}>
                  <td>{formatDate(transaction.date)}</td>
                  <td>
                    <span className="cell-primary">{transaction.description || transaction.category?.name || "Transfer antar akun"}</span>
                    {transaction.refNo && <span className="cell-secondary">{transaction.refNo}</span>}
                  </td>
                  <td>{transaction.account.name}</td>
                  <td className="numeric">{transaction.type === "IN" ? formatRupiah(transaction.amount) : transaction.type === "TRANSFER" ? "Transfer" : "—"}</td>
                  <td className="numeric">{transaction.type === "OUT" ? formatRupiah(transaction.amount) : transaction.type === "TRANSFER" ? formatRupiah(transaction.amount) : "—"}</td>
                  <td><span className={`badge ${transaction.status === "VOID" ? "badge-void" : "badge-posted"}`}>{transaction.status === "VOID" ? "Void" : "Tercatat"}</span></td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td className="empty-state" colSpan={6}><CircleDollarSign aria-hidden="true" size={18} /> Belum ada transaksi.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
