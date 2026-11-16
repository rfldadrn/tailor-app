import {
  BookOpen,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  LayoutDashboard,
  Settings2,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type AppRole = "OWNER" | "ADMIN" | "VIEWER";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: AppRole[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Ruang kerja",
    items: [
      { label: "Ringkasan", href: "/dashboard", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "VIEWER"] },
      { label: "Buku kas", href: "/keuangan/buku-kas", icon: BookOpen, roles: ["OWNER", "ADMIN", "VIEWER"] },
    ],
  },
  {
    label: "Laporan",
    items: [
      { label: "Laba rugi", href: "/keuangan/laporan/laba-rugi", icon: ChartNoAxesCombined, roles: ["OWNER", "ADMIN", "VIEWER"] },
      { label: "Neraca", href: "/keuangan/laporan/neraca", icon: CircleDollarSign, roles: ["OWNER", "ADMIN", "VIEWER"] },
    ],
  },
  {
    label: "Data usaha",
    items: [
      { label: "Akun", href: "/keuangan/master/akun", icon: WalletCards, roles: ["OWNER", "ADMIN"] },
      { label: "Kategori", href: "/keuangan/master/kategori", icon: Settings2, roles: ["OWNER", "ADMIN"] },
      { label: "Pihak", href: "/keuangan/master/pihak", icon: ContactRound, roles: ["OWNER", "ADMIN"] },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { label: "Pengguna", href: "/pengaturan/pengguna", icon: UsersRound, roles: ["OWNER"] },
      { label: "Kunci periode", href: "/pengaturan/periode", icon: CalendarClock, roles: ["OWNER"] },
    ],
  },
];
