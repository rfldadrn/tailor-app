"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { voidTransaction, type ActionState } from "@/modules/finance/actions/transactions";

const initialState: ActionState = { status: "idle", message: "" };

export function TransactionVoid({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(voidTransaction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)} type="button">Void</button>
      {open && (
        <div className="drawer-backdrop" role="presentation">
          <section aria-labelledby={`void-title-${transactionId}`} aria-modal="true" className="drawer confirm-panel" role="dialog">
            <div className="drawer-header">
              <h2 id={`void-title-${transactionId}`}>Void transaksi</h2>
              <button aria-label="Tutup" className="button icon-button" onClick={() => setOpen(false)} type="button">×</button>
            </div>
            <p className="drawer-hint">Transaksi tidak dihapus, tetapi dampaknya pada saldo dan laporan akan dibatalkan.</p>
            <form action={action} className="form-stack" ref={formRef}>
              <input name="transactionId" type="hidden" value={transactionId} />
              <label className="field">
                Alasan void
                <textarea autoFocus maxLength={240} minLength={5} name="reason" placeholder="Jelaskan mengapa transaksi ini dibatalkan" required />
              </label>
              {state.message && <p className={state.status === "error" ? "form-error" : "form-success"} role="status">{state.message}</p>}
              <div className="form-actions">
                <button className="button" onClick={() => setOpen(false)} type="button">Batal</button>
                <button className="button button-danger" disabled={pending} type="submit">{pending ? "Menyimpan..." : "Void transaksi"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
