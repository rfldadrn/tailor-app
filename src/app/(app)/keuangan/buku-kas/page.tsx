import Link from "next/link";
import { PageHeader } from "@/components/erp/page-header";
import { TransactionDrawer } from "@/components/erp/transaction-drawer";
import { TransactionVoid } from "@/components/erp/transaction-void";
import { formatDate, formatRupiah } from "@/lib/money";
import { requireUser } from "@/lib/rbac";
import { getBookPage } from "@/modules/finance/repo/finance";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CashBookPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const requestedMonth = one(params.month);
  const month = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : currentMonth;
  const parsedPage = Number(one(params.page) ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const filters = {
    accountId: one(params.account) || undefined,
    categoryId: one(params.category) || undefined,
    partyId: one(params.party) || undefined,
    search: one(params.search)?.trim() || undefined,
  };
  const data = await getBookPage(user.orgId, month, page, filters);
  const canEdit = user.role !== "VIEWER";
  const activeAccounts = data.accounts.filter((account) => account.isActive);
  const activeCategories = data.categories.filter((category) => category.isActive);
  const query = new URLSearchParams();
  query.set("month", month);
  if (filters.accountId) query.set("account", filters.accountId);
  if (filters.categoryId) query.set("category", filters.categoryId);
  if (filters.partyId) query.set("party", filters.partyId);
  if (filters.search) query.set("search", filters.search);

  return (
    <>
      <PageHeader
        title="Buku kas"
        description="Catat dan telusuri semua uang masuk, keluar, dan transfer."
        action={
          <div className="page-header-action">
            <a className="button" href={`/api/export/transactions?${query.toString()}`}>Ekspor CSV</a>
            {canEdit && (
              <TransactionDrawer
                accounts={activeAccounts.map(({ id, name }) => ({ id, name }))}
                categories={activeCategories.map(({ id, kind, name }) => ({ id, kind, name }))}
                parties={data.parties.map(({ id, name }) => ({ id, name }))}
                today={new Date().toISOString().slice(0, 10)}
              />
            )}
          </div>
        }
      />
      <form className="filter-bar" method="get">
        <label className="sr-only" htmlFor="cash-month">Periode</label>
        <input defaultValue={month} id="cash-month" name="month" type="month" />
        <label className="sr-only" htmlFor="cash-account">Akun</label>
        <select defaultValue={filters.accountId ?? ""} id="cash-account" name="account">
          <option value="">Semua akun</option>
          {data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="cash-category">Kategori</label>
        <select defaultValue={filters.categoryId ?? ""} id="cash-category" name="category">
          <option value="">Semua kategori</option>
          {data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="cash-party">Pihak</label>
        <select defaultValue={filters.partyId ?? ""} id="cash-party" name="party">
          <option value="">Semua pihak</option>
          {data.parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="cash-search">Cari</label>
        <input defaultValue={filters.search} id="cash-search" name="search" placeholder="Cari keterangan / nota" type="search" />
        <button className="button" type="submit">Terapkan</button>
        <Link className="button" href="/keuangan/buku-kas">Reset filter</Link>
      </form>
      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th><th>Keterangan</th><th>Akun</th>
                <th className="numeric">Debit</th><th className="numeric">Kredit</th>
                <th className="numeric">Saldo berjalan</th><th>Status</th>
                {canEdit && <th><span className="sr-only">Aksi</span></th>}
              </tr>
            </thead>
            <tbody>
              <tr className="is-opening">
                <td>{month.split("-").reverse().join("/")}</td>
                <td>Saldo awal periode</td>
                <td>{filters.accountId ? activeAccounts.find((account) => account.id === filters.accountId)?.name ?? "Akun" : "Semua akun"}</td>
                <td className="numeric">—</td><td className="numeric">—</td>
                <td className="numeric">{formatRupiah(data.openingBalance)}</td>
                <td>—</td>{canEdit && <td />}
              </tr>
              {data.transactions.map((transaction) => {
                const isTransfer = transaction.type === "TRANSFER";
                const debit = transaction.type === "IN"
                  ? transaction.amount
                  : isTransfer && (filters.accountId ? transaction.toAccountId === filters.accountId : true)
                    ? transaction.amount
                    : 0;
                const credit = transaction.type === "OUT"
                  ? transaction.amount
                  : isTransfer && (filters.accountId ? transaction.accountId === filters.accountId : true)
                    ? transaction.amount
                    : 0;
                const accountLabel = isTransfer
                  ? `${transaction.account.name} → ${transaction.toAccount?.name ?? "Akun tujuan"}`
                  : transaction.account.name;
                return (
                  <tr className={transaction.status === "VOID" ? "is-void" : ""} key={transaction.id}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      <span className="cell-primary">{transaction.description || transaction.category?.name || "Transfer antar akun"}</span>
                      <span className="cell-secondary">
                        {[transaction.refNo, transaction.party?.name].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td>{accountLabel}</td>
                    <td className="numeric">{debit ? formatRupiah(debit) : "—"}</td>
                    <td className="numeric">{credit ? formatRupiah(credit) : "—"}</td>
                    <td className="numeric">{formatRupiah(data.balanceById[transaction.id] ?? data.openingBalance)}</td>
                    <td><span className={`badge ${transaction.status === "VOID" ? "badge-void" : "badge-posted"}`}>{transaction.status === "VOID" ? "Void" : "Tercatat"}</span></td>
                    {canEdit && <td>{transaction.status === "POSTED" && <TransactionVoid transactionId={transaction.id} />}</td>}
                  </tr>
                );
              })}
              {data.transactions.length === 0 && (
                <tr><td className="empty-state" colSpan={canEdit ? 8 : 7}>Belum ada transaksi pada periode ini. Catat transaksi pertama untuk memulai.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>{data.total} transaksi · Halaman {data.page} dari {data.pages}</span>
          <div className="pagination">
            {data.page > 1 && <Link className="button" href={`/keuangan/buku-kas?${query.toString()}&page=${data.page - 1}`}>Sebelumnya</Link>}
            {data.page < data.pages && <Link className="button" href={`/keuangan/buku-kas?${query.toString()}&page=${data.page + 1}`}>Berikutnya</Link>}
          </div>
        </div>
      </section>
    </>
  );
}
