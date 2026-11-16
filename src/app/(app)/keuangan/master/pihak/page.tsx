import { DeactivateControl } from "@/components/erp/deactivate-control";
import { MasterForm } from "@/components/erp/master-form";
import { PageHeader } from "@/components/erp/page-header";
import { requireUser } from "@/lib/rbac";
import { createParty } from "@/modules/finance/actions/master";
import { getParties } from "@/modules/finance/repo/master";

const kindLabels: Record<string, string> = {
  CUSTOMER: "Pelanggan",
  EMPLOYEE: "Karyawan",
  OTHER: "Lainnya",
};

export default async function PartiesPage() {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parties = await getParties(user.orgId);

  return (
    <>
      <PageHeader title="Pihak" description="Data pelanggan dan karyawan yang terkait dengan transaksi." />
      <div className="master-layout">
        <section className="panel">
          <div className="panel-header"><h2>Daftar pihak</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nama</th><th>Jenis</th><th>Telepon</th><th>Status</th><th /></tr></thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id}>
                    <td>{party.name}</td><td>{kindLabels[party.kind] ?? party.kind}</td>
                    <td>{party.phone ?? "—"}</td>
                    <td><span className={`badge ${party.isActive ? "badge-posted" : ""}`}>{party.isActive ? "Aktif" : "Nonaktif"}</span></td>
                    <td>{party.isActive && <DeactivateControl entity="party" id={party.id} name={party.name} />}</td>
                  </tr>
                ))}
                {parties.length === 0 && <tr><td className="empty-state" colSpan={5}>Belum ada pihak.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <MasterForm
          action={createParty}
          fields={[
            { name: "name", label: "Nama", required: true },
            { name: "kind", label: "Jenis pihak", type: "select", required: true, options: [
              { label: "Pelanggan", value: "CUSTOMER" },
              { label: "Karyawan", value: "EMPLOYEE" },
              { label: "Lainnya", value: "OTHER" },
            ] },
            { name: "phone", label: "Nomor telepon (opsional)" },
          ]}
          title="Tambah pihak"
        />
      </div>
    </>
  );
}
