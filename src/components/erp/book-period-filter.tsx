"use client";

import { useState } from "react";
import type { BookPeriod } from "@/modules/finance/period";

export function BookPeriodFilter({
  period,
  date,
  month,
}: {
  period: BookPeriod;
  date: string;
  month: string;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedDate, setSelectedDate] = useState(date);
  const [selectedMonth, setSelectedMonth] = useState(month);

  function changePeriod(value: string) {
    const nextPeriod: BookPeriod =
      value === "day" || value === "week" || value === "month" ? value : selectedPeriod;
    if (nextPeriod === "month" && selectedPeriod !== "month") {
      setSelectedMonth(selectedDate.slice(0, 7));
    } else if (nextPeriod !== "month" && selectedPeriod === "month") {
      setSelectedDate(`${selectedMonth}-01`);
    }
    setSelectedPeriod(nextPeriod);
  }

  return (
    <>
      <label className="sr-only" htmlFor="cash-period">Rentang transaksi</label>
      <select id="cash-period" name="period" onChange={(event) => changePeriod(event.target.value)} value={selectedPeriod}>
        <option value="day">Harian</option>
        <option value="week">Mingguan</option>
        <option value="month">Bulanan</option>
      </select>
      {selectedPeriod === "month" ? (
        <>
          <label className="sr-only" htmlFor="cash-month">Bulan</label>
          <input
            id="cash-month"
            name="month"
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setSelectedDate(`${event.target.value}-01`);
            }}
            required
            type="month"
            value={selectedMonth}
          />
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor="cash-date">Tanggal</label>
          <input
            id="cash-date"
            name="date"
            onChange={(event) => {
              setSelectedDate(event.target.value);
              if (event.target.value) setSelectedMonth(event.target.value.slice(0, 7));
            }}
            required
            type="date"
            value={selectedDate}
          />
        </>
      )}
    </>
  );
}
