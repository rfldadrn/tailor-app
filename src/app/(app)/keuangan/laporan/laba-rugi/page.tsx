import { PageHeader } from "@/components/erp/page-header";
import { PrintButton } from "@/components/erp/print-button";
import { formatRupiah } from "@/lib/money";
import { requireUser } from "@/lib/rbac";
import { profitForPeriod } from "@/modules/finance/calc";
import { getFinanceSnapshot } from "@/modules/finance/repo/finance";

function getMonth(search: string | undefined): string {
  return search && /^\d{4}-(0[1-9]|1[0-2])$/.test(search)
    ? search
    : new Date().toISOString().slice(0, 7);
}

function getPeriod(month: string) {
  const from = new Date(`${month}-01T00:00:00.000Z`);
  const until = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from, until };
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const month = getMonth((await searchParams).month);
  const { from, until } = getPeriod(month);
  const data = await getFinanceSnapshot(user.orgId);
  const previousFrom = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1));
  const previousUntil = new Date(from.getTime() - 1);
  const periodTransactions = data.transactionRows.filter(
    (transaction) => transaction.status === "POSTED" && transaction.date >= from && transaction.date <= until,
  );
  const incomeRows = new Map<string, { name: string; amount: number }>();
  const expenseRows = new Map<string, { name: string; amount: number }>();
  for (const transaction of periodTransactions) {
    const category = transaction.category;
    if (!category || !transaction.categoryId) continue;
    if (category.kind === "INCOME" && transaction.type === "IN") {
      const current = incomeRows.get(category.id) ?? { name: category.name, amount: 0 };
      current.amount += transaction.amount;
      incomeRows.set(category.id, current);
    } else if (category.kind === "EXPENSE" && transaction.type === "OUT") {
      const current = expenseRows.get(category.id) ?? { name: category.name, amount: 0 };
      current.amount += transaction.amount;
      expenseRows.set(category.id, current);
    }
  }
  const income = [...incomeRows.values()].reduce((total, row) => total + row.amount, 0);
  const expenses = [...expenseRows.values()].reduce((total, row) => total + row.amount, 0);
  const profit = profitForPeriod(data.transactions, data.categories, from, until);
  const previousProfit = profitForPeriod(data.transactions, data.categories, previousFrom, previousUntil);
  const margin = income === 0 ? 0 : (profit / income) * 100;
  const previousRevenue = data.transactionRows
    .filter((transaction) =>
      transaction.status === "POSTED" &&
      transaction.type === "IN" &&
      transaction.category?.kind === "INCOME" &&
      transaction.date >= previousFrom &&
      transaction.date <= previousUntil,
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
  const previousMargin = previousRevenue === 0 ? 0 : (previousProfit / previousRevenue) * 100;

  return (
    <>
      <PageHeader
        title="Laba rugi"
        description="Ringkasan pendapatan dan biaya usaha per bulan."
        action={<><a className="button" href={`/api/export/report?type=profit&month=${month}`}>Ekspor CSV</a><PrintButton /></>}
      />
      <form className="filter-bar report-filter" method="get">
        <label className="sr-only" htmlFor="profit-month">Periode laporan</label>
        <input defaultValue={month} id="profit-month" name="month" type="month" />
        <button className="button" type="submit">Tampilkan</button>
      </form>
      <section className="report-section">
        <div className="report-meta">
          <strong>{data.organizationName}</strong>
          <span>Laporan laba rugi · {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(from)}</span>
          <span>Dicetak {new Intl.DateTimeFormat("id-ID").format(new Date())} oleh {user.name ?? user.email}</span>
        </div>
        <table className="report-table">
          <tbody>
            <tr className="report-section-title"><td colSpan={2}>Pendapatan</td></tr>
            {[...incomeRows.values()].sort((a, b) => a.name.localeCompare(b.name, "id")).map((row) => (
              <tr className="indent" key={row.name}><td>{row.name}</td><td className="report-amount">{formatRupiah(row.amount)}</td></tr>
            ))}
            <tr className="subtotal"><td>Total pendapatan</td><td className="report-amount">{formatRupiah(income)}</td></tr>
            <tr className="report-section-title"><td colSpan={2}>Biaya</td></tr>
            {[...expenseRows.values()].sort((a, b) => a.name.localeCompare(b.name, "id")).map((row) => (
              <tr className="indent" key={row.name}><td>{row.name}</td><td className="report-amount">{formatRupiah(row.amount)}</td></tr>
            ))}
            <tr className="subtotal"><td>Total biaya</td><td className="report-amount">{formatRupiah(expenses)}</td></tr>
            <tr className="grand-total"><td>Laba bersih</td><td className="report-amount">{formatRupiah(profit)}</td></tr>
          </tbody>
        </table>
        <div className="report-comparison">
          <div><span>Margin laba</span><strong>{margin.toFixed(1)}%</strong></div>
          <div><span>Laba bulan sebelumnya</span><strong>{formatRupiah(previousProfit)}</strong></div>
          <div><span>Margin bulan sebelumnya</span><strong>{previousMargin.toFixed(1)}%</strong></div>
        </div>
      </section>
    </>
  );
}
