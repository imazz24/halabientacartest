"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Car, DollarSign, Users, Wallet } from "lucide-react";
import { getDashboard } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { DashboardData } from "@/types";
import { StatCard, LoadingSpinner, EmptyState } from "@/components/admin/ui";
import ReturnsDue from "@/components/admin/ReturnsDue";
import { BookingStatusBadge } from "@/components/ui/Badges";
import { formatDateTime, formatPrice } from "@/lib/format";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    getDashboard(token)
      .then(setData)
      .catch(showErrorToast)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label={t("admin.ui.loadingDashboard")} />;

  if (!data) {
    return <EmptyState title={t("errors.loadDashboard")} text={t("errors.dashboardBackend")} />;
  }

  const stats = data.stats;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title={t("admin.dashboard.totalCars")} value={stats.total_cars} icon={<Car className="h-5 w-5" />} />
        <StatCard title={t("admin.dashboard.availableCars")} value={stats.available_cars} icon={<Car className="h-5 w-5" />} accent="bg-emerald-500/12 text-emerald-400" />
        <StatCard title={t("admin.dashboard.activeRentals")} value={stats.active_rentals} icon={<CalendarCheck className="h-5 w-5" />} accent="bg-violet-500/12 text-violet-400" />
        <StatCard title={t("admin.dashboard.pendingRequests")} value={stats.pending_requests} icon={<Users className="h-5 w-5" />} accent="bg-amber-500/12 text-amber-400" />
        <StatCard title={t("admin.dashboard.totalCustomers")} value={stats.total_customers} icon={<Users className="h-5 w-5" />} accent="bg-sky-500/12 text-sky-400" />
        <StatCard title={t("admin.dashboard.monthlyRevenue")} value={formatPrice(stats.monthly_revenue, "$", locale)} icon={<Wallet className="h-5 w-5" />} accent="bg-accent/15 text-accent" />
      </div>

      {/* Cars that are out and due back — the daily chase list. */}
      <div className="mt-8">
        <ReturnsDue />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {/* Recent bookings */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-bold text-ink">{t("admin.dashboard.recentBookings")}</h2>
            <Link href="/admin/bookings" className="text-xs font-semibold text-accent-dark hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          {data.recent_bookings.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">{t("admin.dashboard.noBookings")}</p>
          ) : (
            <div className="divide-y divide-line">
              {data.recent_bookings.slice(0, 6).map((booking) => (
                <Link key={booking.id} href={`/admin/bookings/${booking.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-bold text-ink">{booking.booking_reference}</p>
                    <p className="truncate text-sm text-slate-600">{booking.customer_full_name} · {booking.car_name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-slate-400 sm:block">{formatDateTime(booking.pickup_datetime, locale)}</span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming rentals */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-bold text-ink">{t("admin.dashboard.upcomingRentals")}</h2>
            <Link href="/admin/bookings" className="text-xs font-semibold text-accent-dark hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          {data.upcoming_rentals.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">{t("admin.dashboard.noUpcoming")}</p>
          ) : (
            <div className="divide-y divide-line">
              {data.upcoming_rentals.slice(0, 6).map((booking) => (
                <Link key={booking.id} href={`/admin/bookings/${booking.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-bold text-ink">{booking.booking_reference}</p>
                    <p className="truncate text-sm text-slate-600">{booking.car_name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-slate-400">{formatDateTime(booking.pickup_datetime, locale)}</span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent customers */}
      <section className="card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-bold text-ink">{t("admin.dashboard.recentCustomers")}</h2>
          <Link href="/admin/customers" className="text-xs font-semibold text-accent-dark hover:underline">
            {t("common.viewAll")}
          </Link>
        </div>
        {data.recent_customers.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">{t("admin.dashboard.noCustomers")}</p>
        ) : (
          <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x">
            {data.recent_customers.slice(0, 6).map((customer) => (
              <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-accent">
                  {customer.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{customer.full_name}</p>
                  <p className="truncate text-xs text-slate-500"><span className="ltr">{customer.phone_number}</span> · {customer.email || t("admin.dashboard.noEmail")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
