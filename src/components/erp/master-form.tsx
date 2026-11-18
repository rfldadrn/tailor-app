"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/modules/finance/actions/transactions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
export type MasterField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "email" | "password" | "select";
  required?: boolean;
  defaultValue?: string;
  options?: { label: string; value: string }[];
};

const initialState: ActionState = { status: "idle", message: "" };

export function MasterForm({
  title,
  action,
  fields,
  submitLabel = "Simpan",
}: {
  title: string;
  action: FormAction;
  fields: MasterField[];
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <section className="panel master-create">
      <div className="panel-header"><h2>{title}</h2></div>
      <form action={formAction} className="form-stack master-form" ref={formRef}>
        {fields.map((field) => (
          <label className="field" key={field.name}>
            {field.label}
            {field.type === "select" ? (
              <select defaultValue={field.defaultValue ?? ""} name={field.name} required={field.required}>
                <option disabled value="">Pilih {field.label.toLowerCase()}</option>
                {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : (
              <input
                autoComplete={field.type === "password" ? "new-password" : "off"}
                max={field.type === "number" ? 2_147_483_647 : undefined}
                min={field.type === "number" ? 0 : undefined}
                name={field.name}
                defaultValue={field.defaultValue}
                required={field.required}
                type={field.type ?? "text"}
              />
            )}
          </label>
        ))}
        {state.message && <p className={state.status === "error" ? "form-error" : "form-success"} role="status">{state.message}</p>}
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Menyimpan..." : submitLabel}
        </button>
      </form>
    </section>
  );
}
