export type BookPeriod = "day" | "week" | "month";

export type BookPeriodRange = {
  period: BookPeriod;
  date: string;
  month: string;
  start: Date;
  end: Date;
  label: string;
};

const dayInMs = 24 * 60 * 60 * 1000;

function parseDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

export function isValidBookDate(value: string | null): value is string {
  return parseDate(value) !== null;
}

function formatDay(value: string): string {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

export function resolveBookPeriod({
  period,
  date,
  month,
  now = new Date(),
}: {
  period?: string | null;
  date?: string | null;
  month?: string | null;
  now?: Date;
} = {}): BookPeriodRange {
  const selectedPeriod: BookPeriod =
    period === "day" || period === "week" || period === "month" ? period : "month";
  const today = now.toISOString().slice(0, 10);

  if (selectedPeriod === "month") {
    const selectedMonth =
      month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : today.slice(0, 7);
    const start = new Date(`${selectedMonth}-01T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    return {
      period: selectedPeriod,
      date: `${selectedMonth}-01`,
      month: selectedMonth,
      start,
      end,
      label: `${selectedMonth.slice(5, 7)}/${selectedMonth.slice(0, 4)}`,
    };
  }

  const parsedDate = parseDate(date);
  const anchor = parsedDate ?? new Date(`${today}T00:00:00.000Z`);
  const selectedDate = anchor.toISOString().slice(0, 10);
  const start = new Date(anchor);

  if (selectedPeriod === "week") {
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  }

  const end = new Date(start.getTime() + (selectedPeriod === "week" ? 7 : 1) * dayInMs);
  const startDay = start.toISOString().slice(0, 10);
  const endDay = new Date(end.getTime() - dayInMs).toISOString().slice(0, 10);

  return {
    period: selectedPeriod,
    date: selectedDate,
    month: selectedDate.slice(0, 7),
    start,
    end,
    label:
      selectedPeriod === "week"
        ? `${formatDay(startDay)} - ${formatDay(endDay)}`
        : formatDay(startDay),
  };
}
