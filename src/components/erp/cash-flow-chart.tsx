"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/money";

export function CashFlowChart({
  data,
}: {
  data: { month: string; masuk: number; keluar: number }[];
}) {
  return (
    <div aria-label="Grafik pemasukan dan pengeluaran enam bulan terakhir" className="chart-area" role="img">
      <ResponsiveContainer height={244} width="100%">
        <BarChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
          <XAxis axisLine={false} dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} />
          <YAxis
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            tickFormatter={(value: number) => value >= 1_000_000 ? `${Math.round(value / 1_000_000)} jt` : `${Math.round(value / 1_000)} rb`}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value) => formatRupiah(Number(value))}
            contentStyle={{ background: "var(--surface)", borderColor: "var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="masuk" fill="var(--income)" name="Masuk" radius={[3, 3, 0, 0]} />
          <Bar dataKey="keluar" fill="var(--expense)" name="Keluar" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
