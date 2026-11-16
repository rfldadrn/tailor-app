"use client";

import { useActionState, useEffect, useState } from "react";
import { deactivateRecord } from "@/modules/finance/actions/master";
import type { ActionState } from "@/modules/finance/actions/transactions";

const initialState: ActionState = { status: "idle", message: "" };

export function DeactivateControl({
  id,
  entity,
  name,
}: {
  id: string;
  entity: "account" | "category" | "party";
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deactivateRecord, initialState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)} type="button">Nonaktifkan</button>
      {open && (
        <div className="drawer-backdrop" role="presentation">
          <section aria-modal="true" className="drawer confirm-panel" role="dialog">
            <div className="drawer-header">
              <h2>Nonaktifkan data</h2>
              <button aria-label="Tutup" className="button icon-button" onClick={() => setOpen(false)} type="button">×</button>
            </div>
            <p className="drawer-hint">“{name}” tidak dapat dipilih untuk transaksi baru. Riwayat yang sudah ada tetap tersimpan.</p>
            <form action={action} className="form-stack">
              <input name="id" type="hidden" value={id} />
              <input name="entity" type="hidden" value={entity} />
              {state.message && <p className={state.status === "error" ? "form-error" : "form-success"} role="status">{state.message}</p>}
              <div className="form-actions">
                <button className="button" onClick={() => setOpen(false)} type="button">Batal</button>
                <button className="button button-danger" disabled={pending} type="submit">{pending ? "Menyimpan..." : "Nonaktifkan"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
