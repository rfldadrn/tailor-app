import { auth } from "@/lib/auth";
import { getTransactionsForExport } from "@/modules/finance/repo/master";

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
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return new Response("Periode tidak valid.", { status: 400 });
  }

  const transactions = await getTransactionsForExport(session.user.orgId, month, {
    accountId: searchParams.get("account") || undefined,
    categoryId: searchParams.get("category") || undefined,
    partyId: searchParams.get("party") || undefined,
    search: searchParams.get("search")?.trim() || undefined,
  });
  const rows = [
    ["Tanggal", "Jenis", "Keterangan", "Akun", "Akun Tujuan", "Kategori", "Pihak", "Nota", "Debit", "Kredit", "Status", "Alasan Void"],
    ...transactions.map((transaction) => [
      transaction.date.toISOString().slice(0, 10),
      transaction.type,
      transaction.description ?? "",
      transaction.account.name,
      transaction.toAccount?.name ?? "",
      transaction.category?.name ?? "",
      transaction.party?.name ?? "",
      transaction.refNo ?? "",
      transaction.type === "IN" ? transaction.amount : 0,
      transaction.type === "OUT" ? transaction.amount : 0,
      transaction.status,
      transaction.voidReason ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="buku-kas-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
