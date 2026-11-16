import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/money";
import {
  balanceSheet,
  employeeReceivable,
  equityContributions,
  profitForPeriod,
} from "@/modules/finance/calc";
import { getFinanceSnapshot } from "@/modules/finance/repo/finance";

function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(text.trim())) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Tidak diizinkan.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? "";
  const type = searchParams.get("type");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !["profit", "balance"].includes(type ?? "")) {
    return new Response("Periode atau jenis laporan tidak valid.", { status: 400 });
  }
  const data = await getFinanceSnapshot(session.user.orgId);
  const from = new Date(`${month}-01T00:00:00.000Z`);
  const until = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const rows: (string | number)[][] = [["Laporan", "Keterangan", "Jumlah (Rp)"]];

  if (type === "profit") {
    for (const transaction of data.transactionRows) {
      if (transaction.status !== "POSTED" || transaction.date < from || transaction.date > until) continue;
      if (transaction.category?.kind === "INCOME" && transaction.type === "IN") {
        rows.push(["Pendapatan", transaction.category.name, transaction.amount]);
      }
      if (transaction.category?.kind === "EXPENSE" && transaction.type === "OUT") {
        rows.push(["Biaya", transaction.category.name, transaction.amount]);
      }
    }
    rows.push(["Laba bersih", "", profitForPeriod(data.transactions, data.categories, from, until)]);
  } else {
    const report = balanceSheet(data.accounts, data.transactions, data.categories, until);
    for (const account of data.accounts) {
      const balance = data.transactions.reduce((total, transaction) => {
        if (transaction.status !== "POSTED" || transaction.date > until) return total;
        if (transaction.accountId === account.id) {
          return total + (transaction.type === "IN" ? transaction.amount : -transaction.amount);
        }
        return total + (transaction.type === "TRANSFER" && transaction.toAccountId === account.id ? transaction.amount : 0);
      }, account.openingBalance);
      rows.push(["Aset", account.name, balance]);
    }
    rows.push(["Aset", "Piutang karyawan", employeeReceivable(data.transactions, data.categories, until)]);
    rows.push(["Ekuitas", "Setoran modal dikurangi prive", equityContributions(data.transactions, data.categories, until)]);
    rows.push(["Ekuitas", "Laba ditahan", profitForPeriod(data.transactions, data.categories, new Date(0), until)]);
    rows.push(["Neraca", "Total aset", report.assets]);
    rows.push(["Neraca", "Total ekuitas", report.equity]);
    rows.push(["Neraca", "Selisih", report.difference]);
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
