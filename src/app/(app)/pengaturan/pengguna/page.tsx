import { MasterForm } from "@/components/erp/master-form";
import { PageHeader } from "@/components/erp/page-header";
import { formatDate } from "@/lib/money";
import { requireUser } from "@/lib/rbac";
import { createUser } from "@/modules/finance/actions/master";
import { getUsers } from "@/modules/finance/repo/master";

const roleLabels: Record<string, string> = {
  OWNER: "Pemilik",
  ADMIN: "Admin",
  VIEWER: "Pembaca",
};

export default async function UsersPage() {
  const user = await requireUser(["OWNER"]);
  const users = await getUsers(user.orgId);

  return (
    <>
      <PageHeader title="Pengguna" description="Atur akses tim ke buku kas dan laporan." />
      <div className="master-layout">
        <section className="panel">
          <div className="panel-header"><h2>Pengguna terdaftar</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Masuk terakhir</th><th>Status</th></tr></thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td><td>{item.email}</td><td>{roleLabels[item.role] ?? item.role}</td>
                    <td>{item.lastLoginAt ? formatDate(item.lastLoginAt) : "Belum pernah"}</td>
                    <td><span className={`badge ${item.isActive ? "badge-posted" : ""}`}>{item.isActive ? "Aktif" : "Nonaktif"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <MasterForm
          action={createUser}
          fields={[
            { name: "name", label: "Nama", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "password", label: "Kata sandi awal (min. 12 karakter)", type: "password", required: true },
            { name: "role", label: "Peran", type: "select", required: true, options: [
              { label: "Admin", value: "ADMIN" },
              { label: "Pembaca", value: "VIEWER" },
            ] },
          ]}
          title="Tambah pengguna"
        />
      </div>
    </>
  );
}
