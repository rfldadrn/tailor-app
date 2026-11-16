import { PageHeader } from "@/components/erp/page-header";
import { PeriodLockForm } from "@/components/erp/period-lock-form";
import { formatDate } from "@/lib/money";
import { requireUser } from "@/lib/rbac";
import { getPeriodLocks } from "@/modules/finance/repo/master";

export default async function PeriodSettingsPage() {
  const user = await requireUser(["OWNER"]);
  const locks = await getPeriodLocks(user.orgId);
  const month = new Date().toISOString().slice(0, 7);

  return (
    <>
      <PageHeader title="Kunci periode" description="Periode yang dikunci tidak dapat menerima perubahan transaksi." />
      <section className="panel period-panel">
        <div className="panel-header"><h2>Kunci bulan</h2></div>
        <div className="panel-body">
          <p className="drawer-hint">Kunci periode hanya bisa dilakukan pemilik. Tindakan ini tercatat di audit dan tidak dapat dibatalkan.</p>
          <PeriodLockForm month={month} />
        </div>
      </section>
      <section className="panel period-history">
        <div className="panel-header"><h2>Riwayat periode terkunci</h2></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Periode</th><th>Dikunci oleh</th><th>Tanggal kunci</th><th>Status</th></tr></thead>
            <tbody>
              {locks.map((lock) => (
                <tr key={lock.id}>
                  <td>{lock.month}</td><td>{lock.lockedBy.name}</td><td>{formatDate(lock.lockedAt)}</td>
                  <td><span className="badge badge-lock">Periode terkunci</span></td>
                </tr>
              ))}
              {locks.length === 0 && <tr><td className="empty-state" colSpan={4}>Belum ada periode yang dikunci.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
