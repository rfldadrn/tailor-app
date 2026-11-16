"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTransaction, type ActionState } from "@/modules/finance/actions/transactions";

type SelectOption = { id: string; name: string };
type CategoryOption = SelectOption & { kind: string };

const initialState: ActionState = { status: "idle", message: "" };

export function TransactionDrawer({
  accounts,
  categories,
  parties,
  today,
}: {
  accounts: SelectOption[];
  categories: CategoryOption[];
  parties: SelectOption[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"IN" | "OUT" | "TRANSFER">("IN");
  const [amount, setAmount] = useState("");
  const [state, action, pending] = useActionState(createTransaction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const refNoRef = useRef<HTMLInputElement>(null);
  const availableCategories = categories.filter((category) =>
    type === "IN"
      ? ["INCOME", "RECEIVABLE", "EQUITY"].includes(category.kind)
      : type === "OUT"
        ? ["EXPENSE", "RECEIVABLE", "EQUITY"].includes(category.kind)
        : false,
  );

  useEffect(() => {
    if (open) amountRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (state.status === "success") {
      setAmount("");
      if (descriptionRef.current) descriptionRef.current.value = "";
      if (refNoRef.current) refNoRef.current.value = "";
      amountRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    function openQuickEntry(event: KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));
      if (!isTyping && event.key.toLowerCase() === "n") setOpen(true);
    }
    window.addEventListener("keydown", openQuickEntry);
    return () => window.removeEventListener("keydown", openQuickEntry);
  }, []);

  return (
    <>
      <button className="button button-primary" onClick={() => setOpen(true)} type="button">
        <span aria-hidden="true">+</span> Catat transaksi
      </button>
      {open && (
        <div
          className="drawer-backdrop"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          role="presentation"
        >
          <section aria-labelledby="transaction-title" aria-modal="true" className="drawer" role="dialog">
            <div className="drawer-header">
              <h2 id="transaction-title">Catat transaksi</h2>
              <button aria-label="Tutup form" className="button icon-button" onClick={() => setOpen(false)} type="button">×</button>
            </div>
            <p className="drawer-hint">Tekan Enter untuk menyimpan. Tombol N membuka form entri cepat.</p>
            <form action={action} className="form-stack" ref={formRef}>
              <div aria-label="Jenis transaksi" className="segmented">
                {([
                  ["IN", "Masuk"],
                  ["OUT", "Keluar"],
                  ["TRANSFER", "Transfer"],
                ] as const).map(([value, label]) => (
                  <button
                    aria-pressed={type === value}
                    key={value}
                    onClick={() => setType(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
                <input name="type" type="hidden" value={type} />
              </div>
              <label className="field">
                Jumlah
                <div className="money-input">
                  <span>Rp</span>
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    placeholder="0"
                    ref={amountRef}
                    required
                    value={amount ? new Intl.NumberFormat("id-ID").format(Number(amount)) : ""}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, "");
                      setAmount(digits);
                    }}
                    type="text"
                  />
                  <input name="amount" type="hidden" value={amount} />
                </div>
              </label>
              <label className="field">
                Tanggal
                <input defaultValue={today} name="date" required type="date" />
              </label>
              <label className="field">
                Akun {type === "TRANSFER" ? "asal" : ""}
                <select defaultValue={accounts[0]?.id ?? ""} name="accountId" required>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              {type === "TRANSFER" ? (
                <label className="field">
                  Ke akun
                  <select defaultValue="" name="toAccountId" required>
                    <option disabled value="">Pilih akun tujuan</option>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              ) : (
                <label className="field">
                  Kategori
                  <select defaultValue="" name="categoryId" required>
                    <option disabled value="">Pilih kategori</option>
                    {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
              )}
              {type !== "TRANSFER" && (
                <label className="field">
                  Pihak (opsional)
                  <select defaultValue="" name="partyId">
                    <option value="">Tanpa pihak</option>
                    {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
                  </select>
                </label>
              )}
              <label className="field">
                No. transaksi / nota
                <input autoComplete="off" maxLength={80} name="refNo" placeholder="JHT-2610-015" ref={refNoRef} />
              </label>
              <label className="field">
                Keterangan
                <input autoComplete="off" maxLength={240} name="description" placeholder="Contoh: Seragam kerja 3 stel" ref={descriptionRef} />
              </label>
              {state.message && (
                <p className={state.status === "error" ? "form-error" : "form-success"} role="status">{state.message}</p>
              )}
              <div className="form-actions">
                <button className="button" onClick={() => setOpen(false)} type="button">Batal</button>
                <button className="button button-primary" disabled={pending} type="submit">
                  {pending ? "Menyimpan..." : "Simpan transaksi"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
