"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgePercent, Gift, Search } from "lucide-react";
import { adminListLoyalty } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { LoyaltyAccount } from "@/types";
import { formatDateTime } from "@/lib/format";
import { PageHeader, LoadingSpinner, EmptyState, Pagination, StatCard } from "@/components/admin/ui";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 10;
const REDEEM_THRESHOLD = 1000;

export default function AdminLoyaltyPage() {
  const { t, locale } = useI18n();
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [redeemedFilter, setRedeemedFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    adminListLoyalty(
      {
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        redeemed_only: redeemedFilter === "" ? undefined : redeemedFilter === "ready",
      },
      token,
    )
      .then((result) => {
        setAccounts(result.items);
        setTotal(result.total);
        setTotalPoints(result.total_points);
      })
      .catch(showErrorToast)
      .finally(() => setLoading(false));
  }, [page, search, redeemedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const readyToRedeem = accounts.filter((a) => a.points_balance >= REDEEM_THRESHOLD).length;

  return (
    <div>
      <PageHeader
        title={t("admin.loyalty.title")}
        subtitle={t("admin.loyalty.subtitle")}
        action={
          <div className="grid grid-cols-2 gap-3">
            <StatCard title={t("admin.loyalty.members")} value={total} icon={<Gift className="h-5 w-5" />} accent="bg-accent/10 text-accent" />
            <StatCard title={t("admin.loyalty.pointsOut")} value={totalPoints} icon={<BadgePercent className="h-5 w-5" />} accent="bg-accent/10 text-accent" />
          </div>
        }
      />

      <div className="card mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10!"
              placeholder={t("admin.loyalty.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input"
            value={redeemedFilter}
            onChange={(e) => {
              setRedeemedFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("admin.loyalty.allAccounts")}</option>
            <option value="ready">{t("admin.loyalty.vouchersBanked")}</option>
            <option value="none">{t("admin.loyalty.noVouchers")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : accounts.length === 0 ? (
        <EmptyState
          title={t("admin.loyalty.emptyTitle")}
          text={t("admin.loyalty.emptyText")}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">{t("admin.loyalty.colCode")}</th>
                  <th className="px-5 py-3.5">{t("admin.loyalty.colPhone")}</th>
                  <th className="px-5 py-3.5">{t("admin.loyalty.colBalance")}</th>
                  <th className="px-5 py-3.5">{t("admin.loyalty.colLifetime")}</th>
                  <th className="px-5 py-3.5">{t("admin.loyalty.colDiscount")}</th>
                  <th className="px-5 py-3.5">{t("admin.loyalty.colSince")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {accounts.map((account) => (
                  <tr key={account.id} className="transition hover:bg-surface">
                    <td className="px-5 py-4 font-mono font-bold tracking-wider text-accent-dark"><span className="ltr">{account.loyalty_code}</span></td>
                    <td className="px-5 py-4 font-medium text-ink"><span className="ltr">{account.phone_number}</span></td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-ink">{account.points_balance}</span>{" "}
                      <span className="text-xs text-slate-400">{t("admin.loyalty.pts")}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{account.total_points_earned}</td>
                    <td className="px-5 py-4">
                      {account.pending_discounts > 0 ? (
                        <span className="badge bg-accent/10 text-accent">
                          {account.pending_discounts === 1
                            ? t("admin.loyalty.vouchersRow", { count: account.pending_discounts })
                            : t("admin.loyalty.vouchersRowPlural", { count: account.pending_discounts })}
                        </span>
                      ) : account.points_balance >= REDEEM_THRESHOLD ? (
                        <span className="badge bg-emerald-500/10 text-emerald-600">{t("admin.loyalty.canRedeem")}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDateTime(account.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-5 py-3 text-xs text-slate-500">
            {readyToRedeem > 0 && (
              <span className="text-emerald-600">
                {readyToRedeem === 1
                  ? t("admin.loyalty.readyHint", { count: readyToRedeem })
                  : t("admin.loyalty.readyHintPlural", { count: readyToRedeem })}
              </span>
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}