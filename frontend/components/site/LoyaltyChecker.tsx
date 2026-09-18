"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgePercent, Gift, Loader2, Phone, Search, Sparkles } from "lucide-react";
import type { LoyaltyAccount } from "@/types";
import { loyaltyLookup, loyaltyRedeem } from "@/services/loyalty";
import { ApiError } from "@/lib/api";
import { normalizeDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import PhoneField from "@/components/ui/PhoneField";
import { toast } from "@/components/ui/toast-store";

const REDEEM_THRESHOLD = 1000;
const LOYALTY_PERCENT = 5;

type LookupState =
  | { phone: string; status: "found"; account: LoyaltyAccount }
  | { phone: string; status: "new" }
  | { phone: string; status: "error" };

export default function LoyaltyChecker() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("+961");
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const validPhone = /^[+\d][\d\s-]{7,}$/.test(phone);
  const normalizedPhone = useMemo(() => normalizeDigits(phone.trim()).replace(/[^\d]/g, ""), [phone]);

  useEffect(() => {
    if (!validPhone) return;
    const timerHandle = setTimeout(async () => {
      let next: LookupState;
      try {
        const account = await loyaltyLookup(normalizedPhone);
        next = { phone: normalizedPhone, status: "found", account };
      } catch (err) {
        next =
          err instanceof ApiError && err.status === 404
            ? { phone: normalizedPhone, status: "new" }
            : { phone: normalizedPhone, status: "error" };
      }
      setLookup(next);
    }, 450);
    return () => clearTimeout(timerHandle);
  }, [normalizedPhone, validPhone]);

  const active = lookup && lookup.phone === normalizedPhone ? lookup : null;
  const status = validPhone ? (active ? active.status : "loading") : "idle";
  const account = active && active.status === "found" ? active.account : null;

  async function redeem() {
    if (!account) return;
    setRedeeming(true);
    try {
      const updated = await loyaltyRedeem(normalizedPhone);
      setLookup({ phone: normalizedPhone, status: "found", account: updated });
      toast.success(t("loyalty.redeemed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("loyalty.redeemError"));
    } finally {
      setRedeeming(false);
    }
  }

  const canRedeem = account != null && account.points_balance >= REDEEM_THRESHOLD;

  return (
    <div className="container-site max-w-3xl py-12">
      <div className="text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Gift className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold text-ink sm:text-4xl">{t("loyalty.title")}</h1>
        <p className="mx-auto mt-3 max-w-lg text-slate-500">
          {t("loyalty.subtitleP1")} <strong className="text-ink">{t("loyalty.subtitleP2")}</strong>{" "}
          {t("loyalty.subtitleP3")} <strong className="text-ink">{t("loyalty.subtitleP4")}</strong>
          {t("loyalty.subtitleP5", { threshold: REDEEM_THRESHOLD.toLocaleString() })}{" "}
          <strong className="text-accent-dark">{t("loyalty.subtitleP6", { percent: LOYALTY_PERCENT })}</strong>.
        </p>
      </div>

      <div className="card mt-10 p-6 sm:p-8">
        <label className="label" htmlFor="loyalty-phone">{t("loyalty.phoneLabel")}</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <PhoneField id="loyalty-phone" value={phone} onChange={setPhone} invalid={false} />
          </div>
          <span className="hidden items-center gap-2 px-2 text-sm text-slate-400 sm:flex">
            <Search className="h-4 w-4" /> {t("loyalty.autoFetch")}
          </span>
        </div>

        {status === "loading" && (
          <p className="mt-5 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-accent" /> {t("loyalty.lookup")}
          </p>
        )}

        {status === "new" && (
          <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-left">
            <p className="flex items-center gap-2 font-semibold text-emerald-700">
              <Sparkles className="h-5 w-5" /> {t("loyalty.newTitle")}
            </p>
            <p className="mt-1 text-sm text-emerald-700/80">
              {t("loyalty.newText")}
            </p>
            <Link href="/cars" className="btn-accent mt-4 inline-flex py-2.5! text-sm">
              {t("loyalty.browseCars")}
            </Link>
          </div>
        )}

        {status === "error" && (
          <p className="mt-5 text-sm text-slate-500">
            {t("loyalty.error")}
          </p>
        )}

        {status === "found" && account && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary p-6 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("loyalty.code")}</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-widest text-accent"><span className="ltr">{account.loyalty_code}</span></p>
                <p className="mt-1 text-xs text-slate-400"><span className="ltr">{account.phone_number}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("loyalty.balance")}</p>
                <p className="mt-1 text-4xl font-extrabold text-accent">{account.points_balance}</p>
                <p className="text-xs text-slate-400">{t("loyalty.points")}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>{t("loyalty.lifetime")}</span>
              <span className="font-bold text-ink">{account.total_points_earned}</span>
            </div>

            {account.pending_discounts > 0 ? (
              <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <p className="flex items-center gap-2 font-bold text-ink">
                  <BadgePercent className="h-5 w-5 text-accent" />
                  {account.pending_discounts === 1
                    ? t("loyalty.vouchersBanked", { count: account.pending_discounts })
                    : t("loyalty.vouchersBankedPlural", { count: account.pending_discounts })}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {account.pending_discounts === 1
                    ? t("loyalty.voucherSingleText")
                    : t("loyalty.voucherMultiText")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/cars" className="btn-accent py-2.5! text-sm">
                    {t("loyalty.bookNow")}
                  </Link>
                  {canRedeem && (
                    <button onClick={redeem} disabled={redeeming} className="btn-outline py-2.5! text-sm">
                      {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgePercent className="h-4 w-4" />}
                      {t("loyalty.redeemAnother")}
                    </button>
                  )}
                </div>
              </div>
            ) : canRedeem ? (
              <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <p className="text-sm text-slate-500">
                  {t("loyalty.redeemExplainP1")}{" "}
                  <strong className="text-ink">{REDEEM_THRESHOLD.toLocaleString()} {t("loyalty.points")}</strong>{" "}
                  {t("loyalty.redeemExplainP2")}{" "}
                  <strong className="text-accent-dark">{t("loyalty.redeemExplainP3", { percent: LOYALTY_PERCENT })}</strong>{" "}
                  {t("loyalty.redeemExplainP4")}{" "}
                  <strong className="text-ink">
                    {(account.points_balance - REDEEM_THRESHOLD).toLocaleString()} {t("loyalty.points")}
                  </strong>.
                </p>
                <button onClick={redeem} disabled={redeeming} className="btn-accent mt-4 py-3!">
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgePercent className="h-4 w-4" />}
                  {t("loyalty.redeemCta")}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>{t("loyalty.progressText")}</span>
                  <span>
                    {account.points_balance}/{REDEEM_THRESHOLD}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (account.points_balance / REDEEM_THRESHOLD) * 100)}%` }}
                  />
                </div>
                <Link href="/cars" className="btn-outline mt-5 py-2.5! text-sm">
                  <Phone className="h-4 w-4" /> {t("loyalty.bookAndEarn")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        {t("loyalty.footerNote")}
      </p>
    </div>
  );
}