"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import {
  accountSchema,
  categorySchema,
  partySchema,
} from "@/modules/finance/schemas";
import type { ActionState } from "@/modules/finance/actions/transactions";

const idleState: ActionState = { status: "idle", message: "" };

function isUniqueConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}

function revalidateFinanceMaster(path: string): void {
  revalidatePath(path);
  revalidatePath("/keuangan/buku-kas");
  revalidatePath("/dashboard");
  revalidatePath("/keuangan/laporan/laba-rugi");
  revalidatePath("/keuangan/laporan/neraca");
}

export async function createAccount(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    openingBalance: formData.get("openingBalance"),
    openingDate: formData.get("openingDate"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data akun tidak valid." };
  const openingDate = new Date(`${parsed.data.openingDate}T00:00:00.000Z`);

  try {
    await db.$transaction(async (transaction) => {
      const account = await transaction.account.create({
        data: {
          ...parsed.data,
          orgId: user.orgId,
          openingDate,
        },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "ACCOUNT_CREATE",
          entity: "Account",
          entityId: account.id,
          after: JSON.stringify(account),
        },
      });
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: "error", message: "Nama akun tersebut sudah digunakan." };
    throw error;
  }
  revalidatePath("/keuangan/master/akun");
  return { status: "success", message: "Akun disimpan." };
}

export async function updateAccount(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = accountSchema.extend({ id: z.string().min(1) }).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    openingBalance: formData.get("openingBalance"),
    openingDate: formData.get("openingDate"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data akun tidak valid." };
  const { id, ...data } = parsed.data;
  const openingDate = new Date(`${data.openingDate}T00:00:00.000Z`);

  let result: "updated" | "not-found" | "date-conflict" = "not-found";
  try {
    result = await db.$transaction(async (transaction) => {
      const before = await transaction.account.findFirst({ where: { id, orgId: user.orgId } });
      if (!before) return "not-found";
      const earlierTransaction = await transaction.transaction.findFirst({
        where: {
          orgId: user.orgId,
          date: { lt: openingDate },
          OR: [{ accountId: id }, { toAccountId: id }],
        },
        select: { id: true },
      });
      if (earlierTransaction) return "date-conflict";
      const after = await transaction.account.update({
        where: { id },
        data: { ...data, openingDate },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "ACCOUNT_UPDATE",
          entity: "Account",
          entityId: id,
          before: JSON.stringify(before),
          after: JSON.stringify(after),
        },
      });
      return "updated";
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: "error", message: "Nama akun tersebut sudah digunakan." };
    throw error;
  }
  if (result === "not-found") return { status: "error", message: "Akun tidak ditemukan." };
  if (result === "date-conflict") {
    return { status: "error", message: "Tanggal saldo awal tidak boleh melewati transaksi akun yang sudah ada." };
  }
  revalidateFinanceMaster("/keuangan/master/akun");
  return { status: "success", message: "Akun diperbarui." };
}

export async function createCategory(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    coaCode: formData.get("coaCode") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data kategori tidak valid." };

  try {
    await db.$transaction(async (transaction) => {
      const category = await transaction.category.create({
        data: { ...parsed.data, orgId: user.orgId },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "CATEGORY_CREATE",
          entity: "Category",
          entityId: category.id,
          after: JSON.stringify(category),
        },
      });
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: "error", message: "Nama kategori tersebut sudah digunakan." };
    throw error;
  }
  revalidatePath("/keuangan/master/kategori");
  revalidatePath("/keuangan/buku-kas");
  return { status: "success", message: "Kategori disimpan." };
}

export async function updateCategory(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = categorySchema.extend({ id: z.string().min(1) }).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    coaCode: formData.get("coaCode") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data kategori tidak valid." };
  const { id, ...data } = parsed.data;

  let updated = false;
  try {
    updated = await db.$transaction(async (transaction) => {
      const before = await transaction.category.findFirst({ where: { id, orgId: user.orgId } });
      if (!before) return false;
      const after = await transaction.category.update({
        where: { id },
        data: { ...data, coaCode: data.coaCode || null },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "CATEGORY_UPDATE",
          entity: "Category",
          entityId: id,
          before: JSON.stringify(before),
          after: JSON.stringify(after),
        },
      });
      return true;
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: "error", message: "Nama kategori tersebut sudah digunakan." };
    throw error;
  }
  if (!updated) return { status: "error", message: "Kategori tidak ditemukan." };
  revalidateFinanceMaster("/keuangan/master/kategori");
  return { status: "success", message: "Kategori diperbarui." };
}

export async function createParty(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = partySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data pihak tidak valid." };

  try {
    await db.$transaction(async (transaction) => {
      const party = await transaction.party.create({
        data: { ...parsed.data, orgId: user.orgId },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "PARTY_CREATE",
          entity: "Party",
          entityId: party.id,
          after: JSON.stringify(party),
        },
      });
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: "error", message: "Nama pihak pada jenis ini sudah digunakan." };
    throw error;
  }
  revalidatePath("/keuangan/master/pihak");
  revalidatePath("/keuangan/buku-kas");
  return { status: "success", message: "Pihak disimpan." };
}

export async function updateParty(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = partySchema.extend({ id: z.string().min(1) }).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data pihak tidak valid." };
  const { id, ...data } = parsed.data;

  let updated = false;
  try {
    updated = await db.$transaction(async (transaction) => {
      const before = await transaction.party.findFirst({ where: { id, orgId: user.orgId } });
      if (!before) return false;
      const after = await transaction.party.update({
        where: { id },
        data: { ...data, phone: data.phone || null },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "PARTY_UPDATE",
          entity: "Party",
          entityId: id,
          before: JSON.stringify(before),
          after: JSON.stringify(after),
        },
      });
      return true;
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: "error", message: "Nama pihak pada jenis ini sudah digunakan." };
    throw error;
  }
  if (!updated) return { status: "error", message: "Pihak tidak ditemukan." };
  revalidateFinanceMaster("/keuangan/master/pihak");
  return { status: "success", message: "Pihak diperbarui." };
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Nama pengguna minimal 2 karakter.").max(80),
  email: z.string().trim().email("Format email tidak valid.").max(254),
  password: z.string().min(12, "Kata sandi minimal 12 karakter.").max(128),
  role: z.enum(["ADMIN", "VIEWER"]),
});

export async function createUser(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER"]);
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Data pengguna tidak valid." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await db.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          orgId: user.orgId,
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          passwordHash,
          role: parsed.data.role,
        },
        select: { id: true, name: true, email: true, role: true, orgId: true, isActive: true },
      });
      await transaction.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: user.id,
          action: "USER_CREATE",
          entity: "User",
          entityId: created.id,
          after: JSON.stringify(created),
        },
      });
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { status: "error", message: "Email tersebut sudah terdaftar." };
    throw error;
  }
  revalidatePath("/pengaturan/pengguna");
  return { status: "success", message: "Pengguna ditambahkan." };
}

const deactivateSchema = z.object({
  id: z.string().min(1),
  entity: z.enum(["account", "category", "party"]),
});

export async function deactivateRecord(
  _previousState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const parsed = deactivateSchema.safeParse({
    id: formData.get("id"),
    entity: formData.get("entity"),
  });
  if (!parsed.success) return { status: "error", message: "Data yang akan dinonaktifkan tidak valid." };
  const { id, entity } = parsed.data;

  const result = await db.$transaction(async (transaction) => {
    if (entity === "account") {
      const before = await transaction.account.findFirst({ where: { id, orgId: user.orgId } });
      if (!before) return null;
      const after = await transaction.account.update({ where: { id }, data: { isActive: false } });
      await transaction.auditLog.create({
        data: { orgId: user.orgId, userId: user.id, action: "ACCOUNT_DEACTIVATE", entity: "Account", entityId: id, before: JSON.stringify(before), after: JSON.stringify(after) },
      });
      return after;
    }
    if (entity === "category") {
      const before = await transaction.category.findFirst({ where: { id, orgId: user.orgId } });
      if (!before) return null;
      const after = await transaction.category.update({ where: { id }, data: { isActive: false } });
      await transaction.auditLog.create({
        data: { orgId: user.orgId, userId: user.id, action: "CATEGORY_DEACTIVATE", entity: "Category", entityId: id, before: JSON.stringify(before), after: JSON.stringify(after) },
      });
      return after;
    }
    const before = await transaction.party.findFirst({ where: { id, orgId: user.orgId } });
    if (!before) return null;
    const after = await transaction.party.update({ where: { id }, data: { isActive: false } });
    await transaction.auditLog.create({
      data: { orgId: user.orgId, userId: user.id, action: "PARTY_DEACTIVATE", entity: "Party", entityId: id, before: JSON.stringify(before), after: JSON.stringify(after) },
    });
    return after;
  });
  if (!result) return { status: "error", message: "Data tidak ditemukan." };
  revalidatePath(`/keuangan/master/${entity === "account" ? "akun" : entity === "category" ? "kategori" : "pihak"}`);
  return { status: "success", message: "Data dinonaktifkan." };
}
