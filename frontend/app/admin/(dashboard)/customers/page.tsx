"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { adminListCustomers } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { CustomerWithStats } from "@/types";
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 10;

export default function AdminCustomersPage() {
  const { t, locale } = useI18n();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    adminListCustomers({ page, page_size: PAGE_SIZE, search }, token)
      .then((result) => {
        setCustomers(result.items);
        setTotal(result.total);
      })
      .catch(showErrorToast)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title={t("admin.customers.title")} subtitle={total === 1 ? t("admin.customers.count", { total }) : t("admin.customers.countPlural", { total })} />

      <div className="card mb-5 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10!"
            placeholder={t("admin.customers.searchPlaceholder")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : customers.length === 0 ? (
        <EmptyState title={t("errors.emptyCustomers")} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">{t("admin.customers.colCustomer")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colPhone")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colEmail")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colBookings")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colActive")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colLast")}</th>
                  <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-2/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-accent">
                          {customer.full_name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-ink">{customer.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600"><span className="ltr">{customer.phone_number}</span></td>
                    <td className="px-5 py-3.5 text-slate-500">{customer.email || "—"}</td>
                    <td className="px-5 py-3.5 font-semibold text-ink">{customer.total_bookings}</td>
                    <td className="px-5 py-3.5 text-slate-600">{customer.active_rentals}</td>
                    <td className="px-5 py-3.5 text-slate-500">{customer.last_booking ? formatDate(customer.last_booking, locale) : "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <Link href={`/admin/customers/${customer.id}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-primary/5 hover:text-accent" title={t("admin.customers.view")}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
