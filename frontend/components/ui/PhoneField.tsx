"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES, DEFAULT_COUNTRY, flagOf, searchCountries, type Country } from "@/lib/countries";
import { normalizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

interface PhoneFieldProps {
  /** Full international number, e.g. "+96170858510". */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  invalid?: boolean;
  placeholder?: string;
}

/**
 * Phone input with a searchable country dial-code list.
 *
 * The value handed to the form is always one international string
 * ("+961 70 858 510" with the country code included), so nothing downstream has
 * to know the field is split in two.
 */
export default function PhoneField({
  value,
  onChange,
  id = "phone",
  invalid = false,
  placeholder = "70 858 510",
}: PhoneFieldProps) {
  const { t } = useI18n();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // The national part is whatever follows the dial code in `value`.
  const national = useMemo(() => {
    const digits = normalizeDigits(value).replace(/[^\d]/g, "");
    return digits.startsWith(country.dial) ? digits.slice(country.dial.length) : digits;
  }, [value, country.dial]);

  const results = useMemo(() => searchCountries(query), [query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function emit(dial: string, rest: string) {
    const digits = normalizeDigits(rest).replace(/[^\d]/g, "");
    onChange(digits ? `+${dial}${digits}` : `+${dial}`);
  }

  function pick(next: Country) {
    setCountry(next);
    setOpen(false);
    setQuery("");
    emit(next.dial, national);
  }

  return (
    <div ref={boxRef} className="relative">
      <div
        className={`flex items-stretch overflow-hidden rounded-xl border bg-surface-2 transition focus-within:ring-2 focus-within:ring-accent/25 ${
          invalid ? "border-red-400" : "border-line focus-within:border-accent"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((state) => !state)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t("phoneField.countryCode", { name: country.name, dial: country.dial })}
          className="flex shrink-0 items-center gap-1.5 border-r border-line px-3 text-sm font-semibold text-ink transition hover:bg-surface"
        >
          <span className="text-base leading-none">{flagOf(country.iso)}</span>
          <span>+{country.dial}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          dir="ltr"
          placeholder={placeholder}
          onChange={(event) => emit(country.dial, event.target.value)}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-slate-400"
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("phoneField.search")}
              aria-label={t("phoneField.searchCountry")}
              className="w-full bg-transparent py-1 text-sm text-ink outline-none placeholder:text-slate-400"
            />
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">{t("phoneField.noMatch", { query })}</li>
            )}
            {results.map((item) => {
              const selected = item.iso === country.iso;
              return (
                <li key={item.iso}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(item)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-surface-2 ${
                      selected ? "text-accent" : "text-ink"
                    }`}
                  >
                    <span className="text-base leading-none">{flagOf(item.iso)}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-slate-400">+{item.dial}</span>
                    {selected && <Check className="h-3.5 w-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="border-t border-line px-3 py-1.5 text-[11px] text-slate-500">
            {t("phoneField.countries", { count: COUNTRIES.length })}
          </p>
        </div>
      )}
    </div>
  );
}
