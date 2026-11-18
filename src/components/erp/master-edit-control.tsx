"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/modules/finance/actions/transactions";
import type { MasterField } from "@/components/erp/master-form";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const initialState: ActionState = { status: "idle", message: "" };

function MasterEditPanel({
  id,
  title,
  action,
  fields,
  onClose,
}: {
  id: string;
  title: string;
  action: FormAction;
  fields: MasterField[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="drawer-backdrop" role="presentation">
      <section aria-labelledby="master-edit-title" aria-modal="true" className="drawer" role="dialog">
        <div className="drawer-header">
          <h2 id="master-edit-title">Ubah {title}</h2>
          <button aria-label="Tutup" className="button icon-button" onClick={onClose} type="button">×</button>
        </div>
        <p className="drawer-hint">Perubahan akan dicatat di riwayat audit.</p>
        <form action={formAction} className="form-stack">
          <input name="id" type="hidden" value={id} />
          {fields.map((field) => (
            <label className="field" key={field.name}>
              {field.label}
              {field.type === "select" ? (
                <select defaultValue={field.defaultValue ?? ""} name={field.name} required={field.required}>
                  <option disabled value="">Pilih {field.label.toLowerCase()}</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  autoComplete="off"
                  defaultValue={field.defaultValue}
                  max={field.type === "number" ? 2_147_483_647 : undefined}
                  min={field.type === "number" ? 0 : undefined}
                  name={field.name}
                  required={field.required}
                  type={field.type ?? "text"}
                />
              )}
            </label>
          ))}
          {state.message && (
            <p className={state.status === "error" ? "form-error" : "form-success"} role="status">
              {state.message}
            </p>
          )}
          <div className="form-actions">
            <button className="button" onClick={onClose} type="button">Tutup</button>
            <button className="button button-primary" disabled={pending} type="submit">
              {pending ? "Menyimpan..." : "Simpan perubahan"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function MasterEditControl({
  id,
  name,
  title,
  action,
  fields,
}: {
  id: string;
  name: string;
  title: string;
  action: FormAction;
  fields: MasterField[];
}) {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  return (
    <>
      <button
        aria-label={`Ubah ${name}`}
        className="text-button"
        onClick={() => {
          setInstance((value) => value + 1);
          setOpen(true);
        }}
        type="button"
      >
        Ubah
      </button>
      {open && (
        <MasterEditPanel
          action={action}
          fields={fields}
          id={id}
          key={instance}
          onClose={() => setOpen(false)}
          title={title}
        />
      )}
    </>
  );
}
