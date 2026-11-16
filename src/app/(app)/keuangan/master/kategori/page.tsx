import { DeactivateControl } from "@/components/erp/deactivate-control";
import { MasterForm } from "@/components/erp/master-form";
import { PageHeader } from "@/components/erp/page-header";
import { requireUser } from "@/lib/rbac";
import { createCategory } from "@/modules/finance/actions/master";
import { getCategories } from "@/modules/finance/repo/master";

const kindLabels: Record<string, string> = {
  INCOME: "Pendapatan",
  EXPENSE: "Biaya",
  RECEIVABLE: "Piutang",
  EQUITY: "Modal",
};

export default async function CategoriesPage() {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const categories = await getCategories(user.orgId);

  return (
    <>
      <PageHeader title="Kategori" description="Kelompokkan transaksi untuk laporan keuangan." />
      <div className="master-layout">
        <section className="panel">
          <div className="panel-header"><h2>Daftar kategori</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nama kategori</th><th>Tipe</th><th>Kode akun</th><th>Status</th><th /></tr></thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td><td>{kindLabels[category.kind] ?? category.kind}</td>
                    <td>{category.coaCode ?? "—"}</td>
                    <td><span className={`badge ${category.isActive ? "badge-posted" : ""}`}>{category.isActive ? "Aktif" : "Nonaktif"}</span></td>
                    <td>{category.isActive && <DeactivateControl entity="category" id={category.id} name={category.name} />}</td>
                  </tr>
                ))}
                {categories.length === 0 && <tr><td className="empty-state" colSpan={5}>Belum ada kategori.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <MasterForm
          action={createCategory}
          fields={[
            { name: "name", label: "Nama kategori", required: true },
            { name: "kind", label: "Tipe kategori", type: "select", required: true, options: [
              { label: "Pendapatan", value: "INCOME" },
              { label: "Biaya", value: "EXPENSE" },
              { label: "Piutang karyawan", value: "RECEIVABLE" },
              { label: "Modal / prive", value: "EQUITY" },
            ] },
            { name: "coaCode", label: "Kode akun (opsional)" },
          ]}
          title="Tambah kategori"
        />
      </div>
    </>
  );
}
