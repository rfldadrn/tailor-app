"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import type { ActionState } from "@/modules/finance/actions/transactions";

const periodSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pilih periode yang valid."),
});

export async function lockPeriod(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(["OWNER"]);
  const parsed = periodSchema.safeParse({ month: formData.get("month") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Periode tidak valid." };
  const month = parsed.data.month;
  const existing = await db.periodLock.findUnique({
    where: { orgId_month: { orgId: user.orgId, month } },
  });
  if (existing) return { status: "error", message: `Periode ${month} sudah dikunci.` };

  await db.$transaction(async (transaction) => {
    const lock = await transaction.periodLock.create({
      data: { orgId: user.orgId, month, lockedById: user.id },
    });
    await transaction.auditLog.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        action: "PERIOD_LOCK",
        entity: "PeriodLock",
        entityId: lock.id,
        after: JSON.stringify(lock),
      },
    });
  });

  revalidatePath("/pengaturan/periode");
  revalidatePath("/keuangan/buku-kas");
  return { status: "success", message: `Periode ${month} berhasil dikunci.` };
}
