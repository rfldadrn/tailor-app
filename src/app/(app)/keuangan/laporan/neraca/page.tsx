import { PageHeader } from "@/components/erp/page-header";
import { PrintButton } from "@/components/erp/print-button";
import { formatRupiah } from "@/lib/money";
import { requireUser } from "@/lib/rbac";
import {
  accountBalance,
  balanceSheet,
  employeeReceivable,
  equityContributions,
  profitForPeriod,
} from "@/modules/finance/calc";
import { getFinanceSnapshot } from "@/modules/finance/repo/finance";

function getMonth(search: string | undefined): string {
  return search && /^\d{4}-(0[1-9]|1[0-2])$/.test(search)
    ? search
    : new Date().toISOString().slice(0, 7);
}

function endOfMonth(month: string): Date {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const month = getMonth((await searchParams).month);
  const until = endOfMonth(month);
  const data = await getFinanceSnapshot(user.orgId);
  const assetsByAccount = data.accounts.map((account) => ({
    name: account.name,
    amount: accountBalance(account, data.transactions, until),
  }));
  const receivables = employeeReceivable(data.transactions, data.categories, until);
  const openingCapital = data.accounts.reduce((total, account) => total + account.openingBalance, 0);
  const capitalMovement = equityContributions(data.transactions, data.categories, until);
  const retainedEarnings = profitForPeriod(data.transactions, data.categories, new Date(0), until);
  const totals = balanceSheet(data.accounts, data.transactions, data.categories, until);

  return (
    <>
      <PageHeader
        title="Neraca"
        description="Posisi aset dan ekuitas pada akhir bulan terpilih."
        action={<><a className="button" href={`/api/export/report?type=balance&month=${month}`}>Ekspor CSV</a><PrintButton /></>}
      />
      <form className="filter-bar report-filter" method="get">
        <label className="sr-only" htmlFor="balance-month">Periode laporan</label>
        <input defaultValue={month} id="balance-month" name="month" type="month" />
        <button className="button" type="submit">Tampilkan</button>
      </form>
      <section className="report-section">
        <div className="report-meta">
          <strong>{data.organizationName}</strong>
          <span>Neraca per {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(until)}</span>
          <span>Dicetak {new Intl.DateTimeFormat("id-ID").format(new Date())} oleh {user.name ?? user.email}</span>
        </div>
        <table className="report-table">
          <tbody>
            <tr className="report-section-title"><td colSpan={2}>Aset</td></tr>
            {assetsByAccount.map((row) => (
              <tr className="indent" key={row.name}><td>{row.name}</td><td className="report-amount">{formatRupiah(row.amount)}</td></tr>
            ))}
            <tr className="indent"><td>Piutang karyawan</td><td className="report-amount">{formatRupiah(receivables)}</td></tr>
            <tr className="grand-total"><td>Total aset</td><td className="report-amount">{formatRupiah(totals.assets)}</td></tr>
            <tr className="report-section-title"><td colSpan={2}>Ekuitas</td></tr>
            <tr className="indent"><td>Saldo awal modal</td><td className="report-amount">{formatRupiah(openingCapital)}</td></tr>
            <tr className="indent"><td>Setoran modal dikurangi prive</td><td className="report-amount">{formatRupiah(capitalMovement)}</td></tr>
            <tr className="indent"><td>Laba ditahan</td><td className="report-amount">{formatRupiah(retainedEarnings)}</td></tr>
            <tr className="grand-total"><td>Total ekuitas</td><td className="report-amount">{formatRupiah(totals.equity)}</td></tr>
          </tbody>
        </table>
        <div className={`report-balance ${totals.difference === 0 ? "is-balanced" : "is-unbalanced"}`}>
          <span>{totals.difference === 0 ? "Neraca seimbang" : "Selisih neraca"}</span>
          <strong>{formatRupiah(Math.abs(totals.difference))}</strong>
        </div>
      </section>
    </>
  );
}
