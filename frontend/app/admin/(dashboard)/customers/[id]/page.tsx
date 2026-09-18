"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminGetCustomer } from "@/services/admin";
import { getAdminToken } from "@/lib/admin-auth";
import type { Booking, CustomerWithStats } from "@/types";
import { BookingStatusBadge } from "@/components/ui/Badges";
import { LoadingSpinner, EmptyState } from "@/components/admin/ui";
import { formatDateTime, formatPrice } from "@/lib/format";
import { showErrorToast } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

interface CustomerDetailProps {
  params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: CustomerDetailProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = await params;
        const token = getAdminToken();
        if (!token) {
          router.replace("/admin/login");
          return;
        }
        const data = await adminGetCustomer(Number(id), token);
        if (!cancelled) {
          setCustomer(data.customer as CustomerWithStats);
          setBookings(data.bookings);
        }
      } catch (err) {
        showErrorToast(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (loading) return <LoadingSpinner />;
  if (!customer) return <EmptyState title={t("errors.customerNotFound")} />;

  const activeRentals = bookings.filter((b) => b.status === "ACTIVE").length;

  return (
    <div>
      <Link href="/admin/customers" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> {t("admin.customers.back")}
      </Link>

      <section className="card mb-6 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-accent">
            {customer.full_name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-ink">{customer.full_name}</h1>
            <p className="text-sm text-slate-500"><span className="ltr">{customer.phone_number}</span> · {customer.email || t("admin.dashboard.noEmail")}</p>
            <p className="mt-0.5 text-xs text-slate-400">{t("admin.customers.since", { when: formatDateTime(customer.created_at, locale) })}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-extrabold text-ink">{bookings.length}</p>
              <p className="text-xs text-slate-500">{t("admin.customers.totalRentals")}</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-accent-dark">{activeRentals}</p>
              <p className="text-xs text-slate-500">{t("admin.customers.colActive")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-bold text-ink">{t("admin.customers.history")}</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">{t("admin.dashboard.noBookings")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">{t("admin.customers.colReference")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colCar")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colPickup")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colReturn")}</th>
                  <th className="px-5 py-3.5">{t("admin.customers.colPrice")}</th>
                  <th className="px-5 py-3.5">{t("common.status")}</th>
                  <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surface-2/60">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-ink">{booking.booking_reference}</td>
                    <td className="px-5 py-3.5 text-slate-600">{booking.car_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDateTime(booking.pickup_datetime, locale)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDateTime(booking.return_datetime, locale)}</td>
                    <td className="px-5 py-3.5 font-semibold text-ink">{formatPrice(booking.final_price ?? booking.estimated_price, "$", locale)}</td>
                    <td className="px-5 py-3.5"><BookingStatusBadge status={booking.status} /></td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/bookings/${booking.id}`} className="text-xs font-semibold text-accent-dark hover:underline">{t("admin.customers.view")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
