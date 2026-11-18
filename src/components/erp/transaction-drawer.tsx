"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createTransaction,
  updateTransaction,
  type ActionState,
} from "@/modules/finance/actions/transactions";

type SelectOption = { id: string; name: string };
type AccountOption = SelectOption & { isActive: boolean };
type CategoryOption = SelectOption & { isActive: boolean; kind: string };
type PartyOption = SelectOption & { isActive: boolean; kind: string };
export type TransactionType = "IN" | "OUT" | "TRANSFER";
export type TransactionEditData = {
  id: string;
  date: Date;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  partyId: string | null;
  refNo: string | null;
  description: string | null;
};

const initialState: ActionState = { status: "idle", message: "" };

export function TransactionDrawer({
  accounts,
  categories,
  parties,
  today,
  transaction,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  parties: PartyOption[];
  today: string;
  transaction?: TransactionEditData;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "IN");
  const customerParties = parties.filter((party) => party.kind === "CUSTOMER");
  const defaultCustomerId = customerParties.find((party) => party.isActive)?.id ?? "";
  const [partyId, setPartyId] = useState(
    transaction ? transaction.partyId ?? "" : type === "IN" ? defaultCustomerId : "",
  );
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const refNoRef = useRef<HTMLInputElement>(null);
  const initialParty = parties.find((party) => party.id === partyId);
  const initialAutoDescription =
    !transaction && type === "IN" && initialParty
      ? `Pemasukan dari ${initialParty.name}`
      : "";
  const autoDescriptionRef = useRef(initialAutoDescription);
  const customDescriptionRef = useRef(Boolean(transaction?.description));
  const availableAccounts = accounts.filter(
    (account) =>
      account.isActive ||
      account.id === transaction?.accountId ||
      account.id === transaction?.toAccountId,
  );
  const availableParties = parties.filter(
    (party) => party.isActive || party.id === transaction?.partyId,
  );
  const availableCategories = categories.filter((category) =>
    category.id === transaction?.categoryId ||
    (category.isActive &&
      (type === "IN"
        ? ["INCOME", "RECEIVABLE", "EQUITY"].includes(category.kind)
        : type === "OUT"
          ? ["EXPENSE", "RECEIVABLE", "EQUITY"].includes(category.kind)
          : false)),
  );

  async function submitTransaction(previousState: ActionState, formData: FormData) {
    const result = transaction
      ? await updateTransaction(previousState, formData)
      : await createTransaction(previousState, formData);
    if (result.status === "success" && !transaction) {
      setAmount("");
      const selectedParty = parties.find((party) => party.id === partyId);
      setAutomaticDescription(
        type === "IN" && selectedParty ? `Pemasukan dari ${selectedParty.name}` : "",
      );
      customDescriptionRef.current = false;
      if (refNoRef.current) refNoRef.current.value = "";
      amountRef.current?.focus();
    }
    return result;
  }

  const [state, action, pending] = useActionState(submitTransaction, initialState);

  function setAutomaticDescription(value: string) {
    autoDescriptionRef.current = value;
    if (descriptionRef.current) descriptionRef.current.value = value;
  }

  function changeType(nextType: TransactionType) {
    if (nextType === type) return;
    setType(nextType);
    let selectedParty = parties.find((party) => party.id === partyId);
    if (nextType === "IN" && selectedParty?.kind !== "CUSTOMER") {
      selectedParty = customerParties.find((party) => party.isActive) ?? customerParties[0];
      setPartyId(selectedParty?.id ?? "");
    }
    if (!customDescriptionRef.current) {
      setAutomaticDescription(
        nextType === "IN" && selectedParty ? `Pemasukan dari ${selectedParty.name}` : "",
      );
    }
  }

  function changeParty(value: string) {
    setPartyId(value);
    const selectedParty = parties.find((party) => party.id === value);
    if (type === "IN" && !customDescriptionRef.current) {
      setAutomaticDescription(
        selectedParty ? `Pemasukan dari ${selectedParty.name}` : "",
      );
    }
  }

  useEffect(() => {
    if (open) amountRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (transaction) return;
    function openQuickEntry(event: KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));
      if (!isTyping && event.key.toLowerCase() === "n") setOpen(true);
    }
    window.addEventListener("keydown", openQuickEntry);
    return () => window.removeEventListener("keydown", openQuickEntry);
  }, [transaction]);

  return (
    <>
      <button
        aria-label={transaction ? `Ubah transaksi ${transaction.refNo ?? ""}` : undefined}
        className={transaction ? "text-button" : "button button-primary"}
        onClick={() => setOpen(true)}
        type="button"
      >
        {transaction ? "Ubah" : <><span aria-hidden="true">+</span> Catat transaksi</>}
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
              <h2 id="transaction-title">{transaction ? "Ubah transaksi" : "Catat transaksi"}</h2>
              <button aria-label="Tutup form" className="button icon-button" onClick={() => setOpen(false)} type="button">×</button>
            </div>
            <p className="drawer-hint">Tekan Enter untuk menyimpan. Tombol N membuka form entri cepat.</p>
            <form action={action} className="form-stack" ref={formRef}>
              {transaction && <input name="id" type="hidden" value={transaction.id} />}
              <div aria-label="Jenis transaksi" className="segmented">
                {([
                  ["IN", "Masuk"],
                  ["OUT", "Keluar"],
                  ["TRANSFER", "Transfer"],
                ] as const).map(([value, label]) => (
                  <button
                    aria-pressed={type === value}
                    key={value}
                    onClick={() => changeType(value)}
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
                <input defaultValue={transaction?.date.toISOString().slice(0, 10) ?? today} name="date" required type="date" />
              </label>
              <label className="field">
                Akun {type === "TRANSFER" ? "asal" : ""}
                <select defaultValue={transaction?.accountId ?? availableAccounts[0]?.id ?? ""} name="accountId" required>
                  {availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              {type === "TRANSFER" ? (
                <label className="field">
                  Ke akun
                  <select defaultValue={transaction?.toAccountId ?? ""} name="toAccountId" required>
                    <option disabled value="">Pilih akun tujuan</option>
                    {availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              ) : (
                <label className="field">
                  Kategori
                  <select defaultValue={transaction?.categoryId ?? ""} name="categoryId" required>
                    <option disabled value="">Pilih kategori</option>
                    {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
              )}
              {type !== "TRANSFER" && (
                <label className="field">
                  {type === "IN" ? "Pihak (default pelanggan, opsional)" : "Pihak (opsional)"}
                  <select name="partyId" onChange={(event) => changeParty(event.target.value)} value={partyId}>
                    <option value="">Tanpa pihak</option>
                    {availableParties.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name} · {party.kind === "CUSTOMER" ? "Pelanggan" : party.kind === "EMPLOYEE" ? "Karyawan" : "Lainnya"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                No. transaksi / nota
                <input autoComplete="off" defaultValue={transaction?.refNo ?? ""} maxLength={80} name="refNo" placeholder="JHT-2610-015" ref={refNoRef} />
              </label>
              <label className="field">
                Keterangan
                <input
                  autoComplete="off"
                  maxLength={240}
                  name="description"
                  defaultValue={transaction?.description ?? initialAutoDescription}
                  onChange={(event) => {
                    const value = event.target.value;
                    customDescriptionRef.current =
                      value.trim().length > 0 && value !== autoDescriptionRef.current;
                  }}
                  placeholder={type === "IN" ? "Pemasukan dari nama pihak" : "Contoh: Seragam kerja 3 stel"}
                  ref={descriptionRef}
                />
              </label>
              {state.message && (
                <p className={state.status === "error" ? "form-error" : "form-success"} role="status">{state.message}</p>
              )}
              <div className="form-actions">
                <button className="button" onClick={() => setOpen(false)} type="button">Batal</button>
                <button className="button button-primary" disabled={pending} type="submit">
                  {pending ? "Menyimpan..." : transaction ? "Simpan perubahan" : "Simpan transaksi"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
