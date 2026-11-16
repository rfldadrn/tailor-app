import { formatRupiah } from "@/lib/money";

export function StatStrip({
  items,
}: {
  items: { label: string; amount: number; tone?: "positive" | "negative" | "neutral"; note?: string }[];
}) {
  return (
    <section className="stat-strip" aria-label="Ringkasan keuangan">
      {items.map((item) => (
        <div className="stat-item" key={item.label}>
          <span>{item.label}</span>
          <strong className={item.tone ? `amount-${item.tone}` : ""}>{formatRupiah(item.amount)}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </section>
  );
}
