import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedTransaction = {
  date: Date;
  type: "IN" | "OUT" | "TRANSFER";
  amount: number;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  partyId?: string;
  refNo: string;
  description: string;
  status?: "POSTED" | "VOID";
  voidReason?: string;
};

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Set SEED_PASSWORD to a value of at least 12 characters before seeding.");
  }

  const organization = await prisma.organization.upsert({
    where: { id: "tailor-bu-rina" },
    update: { name: "Tailor Bu Rina" },
    create: { id: "tailor-bu-rina", name: "Tailor Bu Rina" },
  });
  const passwordHash = await bcrypt.hash(password, 12);

  for (const [name, email, role] of [
    ["Rina Puspita", "owner@tailor.local", "OWNER"],
    ["Dewi Anggraini", "admin@tailor.local", "ADMIN"],
    ["Bagus Santoso", "viewer@tailor.local", "VIEWER"],
  ]) {
    await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash, role, orgId: organization.id, isActive: true },
      create: { name, email, passwordHash, role, orgId: organization.id },
    });
  }

  const now = new Date();
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const accounts = [
    { name: "Tunai", kind: "CASH", openingBalance: 2_500_000 },
    { name: "Rekening BCA", kind: "BANK", openingBalance: 8_500_000 },
    { name: "GoPay", kind: "EWALLET", openingBalance: 420_000 },
  ];
  for (const account of accounts) {
    await prisma.account.upsert({
      where: { orgId_name: { orgId: organization.id, name: account.name } },
      update: account,
      create: { ...account, orgId: organization.id, openingDate: firstMonth },
    });
  }

  const categories = [
    ["Upah Jahitan", "INCOME"],
    ["Pendapatan Lain", "INCOME"],
    ["Gaji Karyawan", "EXPENSE"],
    ["Pinjaman Harian Karyawan", "RECEIVABLE"],
    ["LAT (Listrik, Air, Telepon)", "EXPENSE"],
    ["Bahan & Benang", "EXPENSE"],
    ["Sewa", "EXPENSE"],
    ["Lain-lain", "EXPENSE"],
    ["Setoran Modal", "EQUITY"],
    ["Prive", "EQUITY"],
  ];
  for (const [name, kind] of categories) {
    await prisma.category.upsert({
      where: { orgId_name: { orgId: organization.id, name } },
      update: { kind },
      create: { orgId: organization.id, name, kind },
    });
  }

  const parties = [
    ["Bu Sari", "CUSTOMER"], ["Pak Hendra", "CUSTOMER"], ["Mbak Lilis", "CUSTOMER"],
    ["Ibu Ratna", "CUSTOMER"], ["Pak Bimo", "CUSTOMER"], ["Nadia Putri", "CUSTOMER"],
    ["Bu Yuni", "CUSTOMER"], ["CV Seragam Jaya", "CUSTOMER"],
    ["Siti Aminah", "EMPLOYEE"], ["Dedi Kurniawan", "EMPLOYEE"],
    ["Maya Lestari", "EMPLOYEE"], ["Agus Setiawan", "EMPLOYEE"],
  ];
  for (const [name, kind] of parties) {
    await prisma.party.upsert({
      where: { orgId_kind_name: { orgId: organization.id, kind, name } },
      update: {},
      create: { orgId: organization.id, name, kind },
    });
  }

  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@tailor.local" } });
  const [cash, bank, wallet] = await Promise.all(
    accounts.map((account) =>
      prisma.account.findUniqueOrThrow({
        where: { orgId_name: { orgId: organization.id, name: account.name } },
      }),
    ),
  );
  const categoryByName = new Map(
    (await prisma.category.findMany({ where: { orgId: organization.id } })).map((category) => [
      category.name,
      category.id,
    ]),
  );
  const partiesByKind = await prisma.party.findMany({ where: { orgId: organization.id } });
  const customers = partiesByKind.filter((party) => party.kind === "CUSTOMER");
  const employees = partiesByKind.filter((party) => party.kind === "EMPLOYEE");
  const categoryId = (name: string) => {
    const id = categoryByName.get(name);
    if (!id) throw new Error(`Seed category "${name}" was not created.`);
    return id;
  };
  const transactions: SeedTransaction[] = [];
  for (let monthOffset = 0; monthOffset < 3; monthOffset += 1) {
    const monthStart = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + monthOffset, 1));
    const year = String(monthStart.getUTCFullYear()).slice(-2);
    const month = String(monthStart.getUTCMonth() + 1).padStart(2, "0");
    const monthDays = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
    const dateFor = (day: number) => new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day));

    for (let day = 1; day <= Math.min(monthDays, 30); day += 1) {
      const customer = customers[(day + monthOffset) % customers.length];
      transactions.push({
        date: dateFor(day),
        type: "IN",
        amount: 95_000 + ((day * 17_319 + monthOffset * 31_000) % 575_000),
        accountId: day % 8 === 0 ? wallet.id : cash.id,
        categoryId: categoryId("Upah Jahitan"),
        partyId: customer.id,
        refNo: `JHT-${year}${month}-${String(day).padStart(3, "0")}`,
        description: day % 3 === 0 ? "Upah jahit pakaian pelanggan" : "Permak dan jahit pakaian",
        ...(monthOffset === 0 && day === 28
          ? { status: "VOID", voidReason: "Nota tercatat dua kali" }
          : {}),
      });
    }

    for (const day of [4, 8, 12, 16, 20, 24, 28]) {
      transactions.push({
        date: dateFor(day),
        type: "OUT",
        amount: 115_000 + day * 2_500,
        accountId: cash.id,
        categoryId: categoryId("Bahan & Benang"),
        refNo: `BAH-${year}${month}-${String(day).padStart(3, "0")}`,
        description: "Belanja kain, benang, dan perlengkapan jahit",
      });
    }

    for (const [index, day] of [7, 14, 21, 28].entries()) {
      const employee = employees[index % employees.length];
      transactions.push({
        date: dateFor(day),
        type: "OUT",
        amount: 625_000 + monthOffset * 25_000,
        accountId: bank.id,
        categoryId: categoryId("Gaji Karyawan"),
        partyId: employee.id,
        refNo: `GAJ-${year}${month}-${String(day).padStart(3, "0")}`,
        description: `Upah mingguan ${employee.name}`,
      });
    }

    transactions.push({
      date: dateFor(15),
      type: "OUT",
      amount: 540_000 + monthOffset * 20_000,
      accountId: bank.id,
      categoryId: categoryId("LAT (Listrik, Air, Telepon)"),
      refNo: `LAT-${year}${month}-015`,
      description: "Tagihan listrik, air, dan telepon",
    });

    for (const [index, day] of [10, 22, 25].entries()) {
      const employee = employees[(index + monthOffset) % employees.length];
      transactions.push({
        date: dateFor(day),
        type: "OUT",
        amount: 150_000 + index * 50_000,
        accountId: cash.id,
        categoryId: categoryId("Pinjaman Harian Karyawan"),
        partyId: employee.id,
        refNo: `KSB-${year}${month}-${String(day).padStart(3, "0")}`,
        description: `Kasbon ${employee.name}`,
      });
      if (index < 2) {
        transactions.push({
          date: dateFor(Math.min(day + 6, monthDays)),
          type: "IN",
          amount: 75_000 + index * 25_000,
          accountId: cash.id,
          categoryId: categoryId("Pinjaman Harian Karyawan"),
          partyId: employee.id,
          refNo: `KBL-${year}${month}-${String(day).padStart(3, "0")}`,
          description: `Pengembalian kasbon ${employee.name}`,
        });
      }
    }

    transactions.push(
      {
        date: dateFor(5),
        type: "TRANSFER",
        amount: 450_000,
        accountId: bank.id,
        toAccountId: cash.id,
        refNo: `TRF-${year}${month}-005`,
        description: "Tarik tunai untuk operasional",
      },
      {
        date: dateFor(18),
        type: "TRANSFER",
        amount: 125_000,
        accountId: cash.id,
        toAccountId: wallet.id,
        refNo: `TRF-${year}${month}-018`,
        description: "Isi saldo dompet digital",
      },
      {
        date: dateFor(2),
        type: "IN",
        amount: 300_000,
        accountId: bank.id,
        categoryId: categoryId("Setoran Modal"),
        refNo: `MOD-${year}${month}-002`,
        description: "Setoran modal usaha",
      },
      {
        date: dateFor(27),
        type: "OUT",
        amount: 200_000,
        accountId: cash.id,
        categoryId: categoryId("Prive"),
        refNo: `PRV-${year}${month}-027`,
        description: "Pengambilan pribadi pemilik",
      },
      {
        date: dateFor(11),
        type: "IN",
        amount: 175_000,
        accountId: cash.id,
        categoryId: categoryId("Pendapatan Lain"),
        partyId: customers[monthOffset % customers.length].id,
        refNo: `LLN-${year}${month}-011`,
        description: "Pemasangan kancing dan obras",
      },
    );
  }

  await prisma.transaction.deleteMany({ where: { orgId: organization.id } });
  await prisma.transaction.createMany({
    data: transactions.map((transaction) => ({
      ...transaction,
      orgId: organization.id,
      createdById: owner.id,
      status: transaction.status ?? "POSTED",
      voidReason: transaction.voidReason ?? null,
    })),
  });

  await prisma.periodLock.upsert({
    where: { orgId_month: { orgId: organization.id, month: `${firstMonth.getUTCFullYear()}-${String(firstMonth.getUTCMonth() + 1).padStart(2, "0")}` } },
    update: { lockedById: owner.id },
    create: {
      orgId: organization.id,
      month: `${firstMonth.getUTCFullYear()}-${String(firstMonth.getUTCMonth() + 1).padStart(2, "0")}`,
      lockedById: owner.id,
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
