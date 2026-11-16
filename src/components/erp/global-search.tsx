"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <form
      action="/keuangan/buku-kas"
      className="global-search"
      onSubmit={(event) => {
        event.preventDefault();
        const search = inputRef.current?.value.trim();
        if (search) router.push(`/keuangan/buku-kas?search=${encodeURIComponent(search)}`);
      }}
    >
      <label className="sr-only" htmlFor="global-search-input">Cari nota atau pihak</label>
      <input id="global-search-input" placeholder="Cari nota atau pihak" ref={inputRef} type="search" />
      <kbd>Ctrl K</kbd>
    </form>
  );
}
