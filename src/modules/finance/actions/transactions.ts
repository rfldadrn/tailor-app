"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { transactionSchema } from "@/modules/finance/schemas";

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const idleState: ActionState = { status: "idle", message: "" };

function dateFromInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function createTransaction(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = transactionSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    accountId: formData.get("accountId"),
    toAccountId: formData.get("toAccountId") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    partyId: formData.get("partyId") || undefined,
    refNo: formData.get("refNo") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Periksa kembali data transaksi." };

  const input = parsed.data;
  const date = dateFromInput(input.date);
  const month = input.date.slice(0, 7);
  const [account, lock] = await Promise.all([
    db.account.findFirst({
      where: { id: input.accountId, orgId: user.orgId, isActive: true },
    }),
    db.periodLock.findUnique({
      where: { orgId_month: { orgId: user.orgId, month } },
    }),
  ]);
  if (lock) return { status: "error", message: `Periode ${month} sudah dikunci.` };
  if (!account) return { status: "error", message: "Akun tidak ditemukan atau sudah dinonaktifkan." };
  if (date < account.openingDate) {
    return {
      status: "error",
      message: `Tanggal sebelum saldo awal akun ${account.name} (${new Intl.DateTimeFormat("id-ID").format(account.openingDate)}).`,
    };
  }

  let toAccountId: string | null = null;
  let categoryId: string | null = null;
  let partyName: string | null = null;
  if (input.type === "TRANSFER") {
    if (!input.toAccountId || input.toAccountId === account.id) {
      return { status: "error", message: "Pilih akun tujuan yang berbeda dari akun asal." };
    }
    const toAccount = await db.account.findFirst({
      where: { id: input.toAccountId, orgId: user.orgId, isActive: true },
    });
    if (!toAccount) return { status: "error", message: "Akun tujuan tidak ditemukan atau sudah dinonaktifkan." };
    toAccountId = toAccount.id;
  } else {
    if (!input.categoryId) return { status: "error", message: "Pilih kategori transaksi." };
    const category = await db.category.findFirst({
      where: { id: input.categoryId, orgId: user.orgId, isActive: true },
    });
    if (!category) return { status: "error", message: "Kategori tidak ditemukan atau sudah dinonaktifkan." };
    const allowedKinds =
      input.type === "IN"
        ? ["INCOME", "RECEIVABLE", "EQUITY"]
        : ["EXPENSE", "RECEIVABLE", "EQUITY"];
    if (!allowedKinds.includes(category.kind)) {
      return { status: "error", message: "Tipe kategori tidak sesuai dengan jenis transaksi." };
    }
    categoryId = category.id;
  }

  if (input.partyId) {
    const party = await db.party.findFirst({
      where: { id: input.partyId, orgId: user.orgId, isActive: true },
    });
    if (!party) return { status: "error", message: "Pihak tidak ditemukan atau sudah dinonaktifkan." };
    partyName = party.name;
  }

  try {
    await db.$transaction(async (transaction) => {
      const created = await transaction.transaction.create({
        data: {
          orgId: user.orgId,
          date,
          type: input.type,
          amount: input.amount,
          accountId: account.id,
          toAccountId,
          categoryId,
          partyId: input.partyId || null,
          refNo: input.refNo || null,
          description: input.description || (input.type === "IN" && partyName ? `Pemasukan dari ${partyName}` : null),
          createdById: user.id,
        },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "TX_CREATE",
          entity: "Transaction",
          entityId: created.id,
          after: JSON.stringify(created),
        },
      });
    });
  } catch (error) {
    if (
      error instanceof z.ZodError
    ) {
      return { status: "error", message: error.issues[0]?.message ?? "Data transaksi tidak valid." };
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { status: "error", message: "Nomor transaksi tersebut sudah digunakan." };
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/keuangan/buku-kas");
  revalidatePath("/keuangan/laporan/laba-rugi");
  revalidatePath("/keuangan/laporan/neraca");
  return { status: "success", message: "Transaksi disimpan." };
}

export async function updateTransaction(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = transactionSchema.extend({ id: z.string().min(1) }).safeParse({
    id: formData.get("id"),
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    accountId: formData.get("accountId"),
    toAccountId: formData.get("toAccountId") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    partyId: formData.get("partyId") || undefined,
    refNo: formData.get("refNo") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Periksa kembali data transaksi." };

  const input = parsed.data;
  const existing = await db.transaction.findFirst({
    where: { id: input.id, orgId: user.orgId },
  });
  if (!existing) return { status: "error", message: "Transaksi tidak ditemukan." };
  if (existing.status !== "POSTED") return { status: "error", message: "Transaksi yang sudah di-void tidak dapat diedit." };

  const targetMonth = input.date.slice(0, 7);
  const existingMonth = existing.date.toISOString().slice(0, 7);
  const lockedMonths = [...new Set([targetMonth, existingMonth])];
  const lock = await db.periodLock.findFirst({
    where: { orgId: user.orgId, month: { in: lockedMonths } },
  });
  if (lock) return { status: "error", message: `Periode ${lock.month} sudah dikunci.` };

  const date = dateFromInput(input.date);
  const account = await db.account.findFirst({
    where: {
      id: input.accountId,
      orgId: user.orgId,
      ...(input.accountId === existing.accountId ? {} : { isActive: true }),
    },
  });
  if (!account) return { status: "error", message: "Akun tidak ditemukan atau sudah dinonaktifkan." };
  if (date < account.openingDate) {
    return {
      status: "error",
      message: `Tanggal sebelum saldo awal akun ${account.name} (${new Intl.DateTimeFormat("id-ID").format(account.openingDate)}).`,
    };
  }

  let toAccountId: string | null = null;
  let categoryId: string | null = null;
  if (input.type === "TRANSFER") {
    if (!input.toAccountId || input.toAccountId === account.id) {
      return { status: "error", message: "Pilih akun tujuan yang berbeda dari akun asal." };
    }
    const toAccount = await db.account.findFirst({
      where: {
        id: input.toAccountId,
        orgId: user.orgId,
        ...(input.toAccountId === existing.toAccountId ? {} : { isActive: true }),
      },
    });
    if (!toAccount) return { status: "error", message: "Akun tujuan tidak ditemukan atau sudah dinonaktifkan." };
    toAccountId = toAccount.id;
  } else {
    if (!input.categoryId) return { status: "error", message: "Pilih kategori transaksi." };
    const category = await db.category.findFirst({
      where: {
        id: input.categoryId,
        orgId: user.orgId,
        ...(input.categoryId === existing.categoryId ? {} : { isActive: true }),
      },
    });
    if (!category) return { status: "error", message: "Kategori tidak ditemukan atau sudah dinonaktifkan." };
    const allowedKinds =
      input.type === "IN"
        ? ["INCOME", "RECEIVABLE", "EQUITY"]
        : ["EXPENSE", "RECEIVABLE", "EQUITY"];
    if (!allowedKinds.includes(category.kind)) {
      return { status: "error", message: "Tipe kategori tidak sesuai dengan jenis transaksi." };
    }
    categoryId = category.id;
  }

  let partyName: string | null = null;
  if (input.partyId) {
    const party = await db.party.findFirst({
      where: {
        id: input.partyId,
        orgId: user.orgId,
        ...(input.partyId === existing.partyId ? {} : { isActive: true }),
      },
    });
    if (!party) return { status: "error", message: "Pihak tidak ditemukan atau sudah dinonaktifkan." };
    partyName = party.name;
  }

  try {
    await db.$transaction(async (transaction) => {
      const updated = await transaction.transaction.update({
        where: { id: existing.id },
        data: {
          date,
          type: input.type,
          amount: input.amount,
          accountId: account.id,
          toAccountId,
          categoryId,
          partyId: input.partyId || null,
          refNo: input.refNo || null,
          description: input.description || (input.type === "IN" && partyName ? `Pemasukan dari ${partyName}` : null),
        },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "TX_UPDATE",
          entity: "Transaction",
          entityId: existing.id,
          before: JSON.stringify(existing),
          after: JSON.stringify(updated),
        },
      });
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { status: "error", message: "Nomor transaksi tersebut sudah digunakan." };
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/keuangan/buku-kas");
  revalidatePath("/keuangan/laporan/laba-rugi");
  revalidatePath("/keuangan/laporan/neraca");
  return { status: "success", message: "Transaksi diperbarui." };
}

const voidSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.string().trim().min(5, "Alasan void minimal 5 karakter.").max(240),
});

export async function voidTransaction(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = voidSchema.safeParse({
    transactionId: formData.get("transactionId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Alasan void wajib diisi." };

  const existing = await db.transaction.findFirst({
    where: { id: parsed.data.transactionId, orgId: user.orgId },
  });
  if (!existing) return { status: "error", message: "Transaksi tidak ditemukan." };
  if (existing.status === "VOID") return { status: "error", message: "Transaksi sudah di-void." };

  const month = existing.date.toISOString().slice(0, 7);
  const lock = await db.periodLock.findUnique({
    where: { orgId_month: { orgId: user.orgId, month } },
  });
  if (lock) return { status: "error", message: `Periode ${month} sudah dikunci.` };

  await db.$transaction(async (transaction) => {
    const updated = await transaction.transaction.update({
      where: { id: existing.id },
      data: { status: "VOID", voidReason: parsed.data.reason },
    });
    await transaction.auditLog.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        action: "TX_VOID",
        entity: "Transaction",
        entityId: existing.id,
        before: JSON.stringify(existing),
        after: JSON.stringify(updated),
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/keuangan/buku-kas");
  revalidatePath("/keuangan/laporan/laba-rugi");
  revalidatePath("/keuangan/laporan/neraca");
  return { status: "success", message: "Transaksi berhasil di-void." };
}
