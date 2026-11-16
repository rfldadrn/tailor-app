import { z } from "zod";

export const transactionSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal transaksi tidak valid.")
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), "Tanggal transaksi tidak valid."),
  type: z.enum(["IN", "OUT", "TRANSFER"]),
  amount: z.coerce.number().int().min(1, "Jumlah harus lebih dari 0.").max(2_147_483_647, "Jumlah melebihi batas akun Rupiah."),
  accountId: z.string().min(1, "Pilih akun."),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  partyId: z.string().optional(),
  refNo: z.string().trim().max(80).optional(),
  description: z.string().trim().max(240).optional(),
});

export const accountSchema = z.object({
  name: z.string().trim().min(2, "Nama akun minimal 2 karakter.").max(60),
  kind: z.enum(["CASH", "BANK", "EWALLET"]),
  openingBalance: z.coerce.number().int().min(0, "Saldo awal tidak boleh negatif.").max(2_147_483_647, "Saldo awal melebihi batas akun Rupiah."),
  openingDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal saldo awal tidak valid.")
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), "Tanggal saldo awal tidak valid."),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter.").max(60),
  kind: z.enum(["INCOME", "EXPENSE", "RECEIVABLE", "EQUITY"]),
  coaCode: z.string().trim().max(30).optional(),
});

export const partySchema = z.object({
  name: z.string().trim().min(2, "Nama pihak minimal 2 karakter.").max(80),
  kind: z.enum(["CUSTOMER", "EMPLOYEE", "OTHER"]),
  phone: z.string().trim().max(30).optional(),
});
