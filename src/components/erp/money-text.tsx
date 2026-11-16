import { formatRupiah } from "@/lib/money";

export function MoneyText({
  amount,
  tone,
}: {
  amount: number;
  tone?: "positive" | "negative";
}) {
  return (
    <span className={`money${tone ? ` amount-${tone}` : ""}`}>
      {amount > 0 ? "+" : amount < 0 ? "−" : ""}
      {formatRupiah(Math.abs(amount))}
    </span>
  );
}
