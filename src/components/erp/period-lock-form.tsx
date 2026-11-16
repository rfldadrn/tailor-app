"use client";

import { useActionState } from "react";
import { lockPeriod } from "@/modules/finance/actions/period";
import type { ActionState } from "@/modules/finance/actions/transactions";

const initialState: ActionState = { status: "idle", message: "" };

export function PeriodLockForm({ month }: { month: string }) {
  const [state, action, pending] = useActionState(lockPeriod, initialState);

  return (
    <form action={action} className="period-lock-form">
      <label className="sr-only" htmlFor="lock-month">Periode yang akan dikunci</label>
      <input defaultValue={month} id="lock-month" name="month" required type="month" />
      <button className="button button-danger" disabled={pending} type="submit">
        {pending ? "Menyimpan..." : "Kunci periode"}
      </button>
      {state.message && <span className={state.status === "error" ? "form-error status-text" : "form-success status-text"} role="status">{state.message}</span>}
    </form>
  );
}
