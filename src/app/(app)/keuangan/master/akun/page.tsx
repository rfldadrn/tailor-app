import { DeactivateControl } from "@/components/erp/deactivate-control";
import { MasterEditControl } from "@/components/erp/master-edit-control";
import { MasterForm } from "@/components/erp/master-form";
import { PageHeader } from "@/components/erp/page-header";
import { formatDate, formatRupiah } from "@/lib/money";
import { requireUser } from "@/lib/rbac";
import { createAccount, updateAccount } from "@/modules/finance/actions/master";
import { getAccounts } from "@/modules/finance/repo/master";

const kindLabels: Record<string, string> = { CASH: "Tunai", BANK: "Rekening", EWALLET: "Dompet digital" };

export default async function AccountsPage() {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const accounts = await getAccounts(user.orgId);

  return (
    <>
      <PageHeader title="Akun" description="Atur tempat penyimpanan uang dan saldo awal." />
      <div className="master-layout">
        <section className="panel">
          <div className="panel-header"><h2>Daftar akun</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nama akun</th><th>Jenis</th><th className="numeric">Saldo awal</th><th>Tanggal mulai</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td><td>{kindLabels[account.kind] ?? account.kind}</td>
                    <td className="numeric">{formatRupiah(account.openingBalance)}</td>
                    <td>{formatDate(account.openingDate)}</td>
                    <td><span className={`badge ${account.isActive ? "badge-posted" : ""}`}>{account.isActive ? "Aktif" : "Nonaktif"}</span></td>
                    <td>
                      <div className="form-actions">
                        <MasterEditControl
                          action={updateAccount}
                          fields={[
                            { name: "name", label: "Nama akun", required: true, defaultValue: account.name },
                            { name: "kind", label: "Jenis akun", type: "select", required: true, defaultValue: account.kind, options: [
                              { label: "Tunai", value: "CASH" },
                              { label: "Rekening", value: "BANK" },
                              { label: "Dompet digital", value: "EWALLET" },
                            ] },
                            { name: "openingBalance", label: "Saldo awal (Rupiah)", type: "number", required: true, defaultValue: String(account.openingBalance) },
                            { name: "openingDate", label: "Tanggal saldo awal", type: "date", required: true, defaultValue: account.openingDate.toISOString().slice(0, 10) },
                          ]}
                          id={account.id}
                          name={account.name}
                          title="akun"
                        />
                        {account.isActive && <DeactivateControl entity="account" id={account.id} name={account.name} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && <tr><td className="empty-state" colSpan={6}>Belum ada akun.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <MasterForm
          action={createAccount}
          fields={[
            { name: "name", label: "Nama akun", required: true },
            { name: "kind", label: "Jenis akun", type: "select", required: true, options: [
              { label: "Tunai", value: "CASH" },
              { label: "Rekening", value: "BANK" },
              { label: "Dompet digital", value: "EWALLET" },
            ] },
            { name: "openingBalance", label: "Saldo awal (Rupiah)", type: "number", required: true },
            { name: "openingDate", label: "Tanggal saldo awal", type: "date", required: true },
          ]}
          title="Tambah akun"
        />
      </div>
    </>
  );
}
