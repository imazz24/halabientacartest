"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Gift,
  Loader2,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import type { Car, Location, LoyaltyEarnResult } from "@/types";
import { checkAvailability, createBooking } from "@/services/bookings";
import { combineLocalDateTime, effectiveDailyPrice, estimateRentalCost, formatDateTime, formatPrice, normalizeDigits, rentalDays, toLocalInputValue } from "@/lib/format";
import { toast } from "@/components/ui/toast-store";
import { COMPANY_WHATSAPP } from "@/components/site/company-info";
import PhoneField from "@/components/ui/PhoneField";
import LoyaltyPanel from "@/components/booking/LoyaltyPanel";
import LocationField, {
  CUSTOM_LOCATION,
  isChoiceComplete,
  locationLabel,
  type LocationChoice,
} from "./LocationField";
import { useI18n } from "@/lib/i18n";

type CustomerForm = z.infer<ReturnType<typeof buildCustomerSchema>>;

function buildCustomerSchema(t: (key: string, vars?: Record<string, string | number>) => string) {
  return z.object({
    fullName: z
      .string()
      .transform((v) => normalizeDigits(v))
      .pipe(z.string().min(2, t("validation.fullName"))),
    phoneNumber: z
      .string()
      .transform((v) => normalizeDigits(v))
      .pipe(
        z
          .string()
          .min(8, t("validation.phone"))
          .regex(/^[+\d][\d\s-]{7,}$/, t("validation.phoneFormat")),
      ),
    email: z.string().email(t("validation.email")).optional().or(z.literal("")),
    notes: z.string().optional(),
  });
}

interface BookingWizardProps {
  car: Car;
  locations: Location[];
}

type Step = "details" | "customer" | "summary";

function todayPlus(days: number, time = "10:00"): { date: string; time: string } {
  const date = new Date(Date.now() + days * 86400000);
  return { date: toLocalInputValue(date).slice(0, 10), time };
}

function fromIso(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const local = toLocalInputValue(d);
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Turns a location choice into the fields the API expects. */
function locationPayload(prefix: "pickup" | "return", choice: LocationChoice) {
  if (choice.value === CUSTOM_LOCATION && choice.point) {
    return {
      [`${prefix}_custom`]: {
        label: choice.point.label || null,
        latitude: choice.point.latitude,
        longitude: choice.point.longitude,
      },
    };
  }
  return { [`${prefix}_location_id`]: Number(choice.value) };
}

/**
 * Shown when the requested dates clash with an existing rental. The site does
 * not advertise availability, so this is framed as "let us find you another
 * car" rather than as a rejection.
 */
function ConflictNotice({ car, message }: { car: Car; message: string }) {
  const { t } = useI18n();
  const whatsapp = `https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(
    t("booking.conflictMessage", { company: "Al Halabi Rent", name: car.name }),
  )}`;

  return (
    <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-ink">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        {message}
      </p>
      <p className="mt-1.5 pl-6 text-sm text-slate-500">
        {t("booking.conflictText")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 pl-6">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-accent py-2! text-xs">
          <MessageCircle className="h-3.5 w-3.5" /> {t("booking.conflictAsk")}
        </a>
        <Link href={`/cars?category=${encodeURIComponent(car.category)}`} className="btn-outline py-2! text-xs">
          {t("booking.conflictBrowse")}
        </Link>
      </div>
    </div>
  );
}

export default function BookingWizard({ car, locations }: BookingWizardProps) {
  const { t } = useI18n();
  const image = car.images.find((img) => img.is_main) ?? car.images[0];

  const customerSchema = useMemo(() => buildCustomerSchema(t), [t]);

  const searchParams = useSearchParams();
  const prefilledPickup = fromIso(searchParams.get("pickup_datetime"));
  const prefilledReturn = fromIso(searchParams.get("return_datetime"));
  const prefilledPickupLocation = searchParams.get("pickup_location");
  const prefilledReturnLocation = searchParams.get("return_location");
  // Colour chosen in the 3D configurator travels with the request so the team
  // sees it in the WhatsApp handoff.
  const prefilledColor = searchParams.get("color");

  const [step, setStep] = useState<Step>("details");
  const [pickupDate, setPickupDate] = useState(prefilledPickup?.date ?? todayPlus(1).date);
  const [pickupTime, setPickupTime] = useState(prefilledPickup?.time ?? todayPlus(1).time);
  const [returnDate, setReturnDate] = useState(prefilledReturn?.date ?? todayPlus(4).date);
  const [returnTime, setReturnTime] = useState(prefilledReturn?.time ?? todayPlus(4).time);
  const [pickup, setPickup] = useState<LocationChoice>({ value: prefilledPickupLocation ?? "", point: null });
  const [dropoff, setDropoff] = useState<LocationChoice>({ value: prefilledReturnLocation ?? "", point: null });
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [result, setResult] = useState<{ reference: string; whatsappUrl: string; loyalty: LoyaltyEarnResult | null } | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{ fullName: string; phoneNumber: string } | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);

  const {
    register,
    control,
    handleSubmit: handleCustomerSubmit,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "+961",
      email: "",
      notes: prefilledColor ? t("booking.preferredColour", { colour: prefilledColor }) : "",
    },
  });

  const watchedPhone = useWatch({ control, name: "phoneNumber" });

  const activeLocations = useMemo(() => locations.filter((l) => l.is_active), [locations]);

  const pickupIso = combineLocalDateTime(pickupDate, pickupTime);
  const returnIso = combineLocalDateTime(returnDate, returnTime);
  const invalidDates = new Date(returnIso) <= new Date(pickupIso);

  const days = invalidDates ? 0 : rentalDays(pickupIso, returnIso);
  const estimate = invalidDates ? 0 : estimateRentalCost(car, days);

  // 5% loyalty voucher, shown only once the customer opts into spending it.
  const discountedEstimate = applyDiscount ? Math.round(estimate * 0.95 * 100) / 100 : estimate;
  const loyaltySaving = applyDiscount ? estimate - discountedEstimate : 0;

  const hasDiscount =
    car.discount_daily_price != null && car.discount_daily_price > 0 && car.discount_daily_price < car.daily_price;
  const effectiveDaily = effectiveDailyPrice(car);

  const pickupName = locationLabel(pickup, activeLocations, t);
  const returnName = locationLabel(dropoff, activeLocations, t);

  function canGoCustomer(): boolean {
    return Boolean(isChoiceComplete(pickup) && isChoiceComplete(dropoff) && !invalidDates && pickupDate && returnDate);
  }

  async function runAvailabilityCheck(): Promise<boolean> {
    setCheckingAvailability(true);
    setAvailabilityError(null);
    try {
      const result = await checkAvailability(car.id, pickupIso, returnIso);
      if (!result.available) {
        setAvailabilityError(result.message);
        return false;
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("booking.errors.generic");
      setAvailabilityError(message);
      return false;
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function goToCustomer() {
    if (!canGoCustomer()) {
      toast.error(t("booking.errors.completeFirst"));
      return;
    }
    const ok = await runAvailabilityCheck();
    if (ok) setStep("customer");
  }

  async function goToSummary() {
    const ok = await runAvailabilityCheck();
    if (ok) setStep("summary");
  }

  async function onSubmitCustomer(values: CustomerForm) {
    const available = await runAvailabilityCheck();
    if (!available) {
      setStep("details");
      return;
    }

    setSubmitting(true);
    setAvailabilityError(null);
    try {
      const response = await createBooking({
        car_id: car.id,
        pickup_datetime: pickupIso,
        return_datetime: returnIso,
        ...locationPayload("pickup", pickup),
        ...locationPayload("return", dropoff),
        full_name: values.fullName,
        phone_number: values.phoneNumber,
        email: values.email || null,
        customer_notes: values.notes || null,
        loyalty_phone: values.phoneNumber,
        redeem_discount: applyDiscount,
      });
      setResult({
        reference: response.booking.booking_reference,
        whatsappUrl: response.whatsapp_url,
        loyalty: response.loyalty_earned,
      });
      setCustomerInfo({ fullName: values.fullName, phoneNumber: values.phoneNumber });
      toast.success(t("booking.successSubmitted"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("booking.errors.submit");
      setAvailabilityError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepsMeta = [
    { key: "details", label: t("booking.stepDetails"), icon: <CalendarDays className="h-4 w-4" /> },
    { key: "customer", label: t("booking.stepCustomer"), icon: <User className="h-4 w-4" /> },
    { key: "summary", label: t("booking.stepSummary"), icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const stepIndex = stepsMeta.findIndex((s) => s.key === step);

  // ---------------- SUCCESS ----------------
  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-8 text-center sm:p-10">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
            {t("booking.successTitle")}
          </h1>

          <p className="mt-4 leading-relaxed text-slate-500">
            {t("booking.successText")}
          </p>

          <div className="mt-6 rounded-2xl bg-surface p-5 text-left text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.car")}</p>
                <p className="font-semibold text-ink">{car.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.pickup")}</p>
                <p className="font-semibold text-ink">{formatDateTime(pickupIso)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.return")}</p>
                <p className="font-semibold text-ink">{formatDateTime(returnIso)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.duration")}</p>
                <p className="font-semibold text-ink">{t("booking.success.days", { days })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.pickupLocation")}</p>
                <p className="font-semibold text-ink">{pickupName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.returnLocation")}</p>
                <p className="font-semibold text-ink">{returnName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.estimatedPrice")}</p>
                {applyDiscount ? (
                  <p className="font-semibold text-accent-dark">
                    <span className="mr-1.5 font-normal text-slate-400 line-through">{formatPrice(estimate)}</span>
                    {formatPrice(discountedEstimate)}
                  </p>
                ) : (
                  <p className="font-semibold text-accent-dark">{formatPrice(discountedEstimate)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("booking.success.customerPhone")}</p>
                <p className="font-semibold text-ink"><span className="ltr">{String(customerPhoneLabel())}</span></p>
              </div>
            </div>
          </div>

          {result.loyalty && (
            <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-5 text-left">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <Gift className="h-4 w-4 text-accent" />
                {t("booking.success.earnedPoints", { points: result.loyalty.points_earned })}
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                {t("booking.success.codeLine", { code: result.loyalty.loyalty_code, balance: String(result.loyalty.points_balance) })}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t("booking.success.pointsHint")}
              </p>
              <a href="/loyalty" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                <Gift className="h-3.5 w-3.5" /> {t("booking.success.checkPoints")}
              </a>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-accent flex-1 py-3.5!">
              <MessageCircle className="h-5 w-5" /> {t("booking.success.continueWhatsApp")}
            </a>
            <Link href="/cars" className="btn-outline flex-1 py-3.5!">
              <ArrowLeft className="h-5 w-5" /> {t("booking.success.backToCars")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function customerPhoneLabel() {
    return customerInfo?.phoneNumber ?? "";
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/cars/${car.id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-accent">
          <ArrowLeft className="h-4 w-4" /> {t("booking.backToCar", { name: car.name })}
        </Link>

        <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          {image && (
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-2xl sm:w-52">
              <Image src={image.image_url} alt={car.name} fill sizes="208px" className="object-cover" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{car.name}</h1>
            <p className="text-sm text-slate-500">{car.year} ··· {car.category} ··· {car.transmission}</p>
            <p className="mt-2 text-lg font-bold text-accent-dark">
              {hasDiscount && (
                <span className="mr-2 text-sm font-medium text-slate-400 line-through">{formatPrice(car.daily_price)}</span>
              )}
              {formatPrice(effectiveDaily)} <span className="text-sm font-medium text-slate-500">{t("common.perDay")}</span>
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-6 flex items-center gap-2">
          {stepsMeta.map((meta, index) => {
            const done = index < stepIndex;
            const active = index === stepIndex;
            return (
              <div key={meta.key} className="flex flex-1 items-center gap-2">
                <button
                  onClick={() => (index < stepIndex ? setStep(meta.key as Step) : undefined)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    active ? "bg-primary text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-surface text-slate-400"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : meta.icon}
                  <span className="hidden sm:inline">{meta.label}</span>
                </button>
                {index < stepsMeta.length - 1 && <div className={`h-0.5 flex-1 rounded ${done ? "bg-emerald-300" : "bg-line"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="card p-6 sm:p-8">
          {/* STEP 1 */}
          {step === "details" && (
            <div>
              <h2 className="text-lg font-bold text-ink">{t("booking.detailsTitle")}</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <LocationField label={t("booking.pickupLocation")} locations={activeLocations} choice={pickup} onChange={setPickup} />
                </div>
                <div>
                  <label className="label flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-accent-dark" /> {t("booking.pickupDate")}</label>
                  <input type="date" className="input" value={pickupDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setPickupDate(e.target.value)} />
                </div>
                <div>
                  <label className="label flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-accent-dark" /> {t("booking.pickupTime")}</label>
                  <input type="time" className="input" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <LocationField label={t("booking.returnLocation")} locations={activeLocations} choice={dropoff} onChange={setDropoff} />
                </div>
                <div>
                  <label className="label flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-accent-dark" /> {t("booking.returnDate")}</label>
                  <input type="date" className="input" value={returnDate} min={pickupDate} onChange={(e) => setReturnDate(e.target.value)} />
                </div>
                <div>
                  <label className="label flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-accent-dark" /> {t("booking.returnTime")}</label>
                  <input type="time" className="input" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
                </div>
              </div>

              {invalidDates && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="h-4 w-4" /> {t("booking.invalidDates")}
                </div>
              )}

              <div className="mt-7 flex justify-end">
                <button
                  onClick={goToCustomer}
                  disabled={!canGoCustomer() || checkingAvailability}
                  className="btn-accent py-3.5!"
                >
                  {checkingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : t("booking.continue")}
                  {!checkingAvailability && <ArrowRight className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === "customer" && (
            <form
              onSubmit={handleCustomerSubmit(async () => {
                const ok = await runAvailabilityCheck();
                if (ok) setStep("summary");
              })}
            >
              <h2 className="text-lg font-bold text-ink">{t("booking.customerTitle")}</h2>
              <div className="mt-6 grid gap-5">
                <div>
                  <label className="label flex items-center gap-1"><User className="h-3.5 w-3.5 text-accent-dark" /> {t("booking.fullName")} {t("common.required")}</label>
                  <input
                    type="text"
                    className={`input ${errors.fullName ? "border-red-400!" : ""}`}
                    placeholder={t("booking.fullNamePlaceholder")}
                    {...register("fullName")}
                  />
                  {errors.fullName && <p className="mt-1 text-xs font-medium text-red-600">{errors.fullName.message}</p>}
                </div>
                <div>
                  <label className="label flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-accent-dark" /> {t("booking.phoneNumber")} {t("common.required")}</label>
                  <Controller
                    control={control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <PhoneField
                        id="phoneNumber"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={Boolean(errors.phoneNumber)}
                      />
                    )}
                  />
                  {errors.phoneNumber ? (
                    <p className="mt-1 text-xs font-medium text-red-400">{errors.phoneNumber.message}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">{t("booking.phoneHint")}</p>
                  )}
                  <LoyaltyPanel phone={watchedPhone} applyDiscount={applyDiscount} onApplyDiscountChange={setApplyDiscount} />
                </div>
                <div>
                  <label className="label">{t("booking.email")} {t("common.optional")}</label>
                  <input
                    type="email"
                    className={`input ${errors.email ? "border-red-400!" : ""}`}
                    placeholder={t("booking.emailPlaceholder")}
                    {...register("email")}
                  />
                  {errors.email && <p className="mt-1 text-xs font-medium text-red-600">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="label">{t("booking.notes")} {t("common.optional")}</label>
                  <textarea
                    className="input min-h-24 resize-y"
                    placeholder={t("booking.notesPlaceholder")}
                    {...register("notes")}
                  />
                </div>
              </div>

              {availabilityError && <ConflictNotice car={car} message={availabilityError} />}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
                <button type="submit" disabled={checkingAvailability} className="btn-accent flex-1 py-3.5!">
                  {checkingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : t("booking.continue")}
                  {!checkingAvailability && <ArrowRight className="h-5 w-5" />}
                </button>
                <button type="button" onClick={() => setStep("details")} className="btn-outline flex-1 py-3.5!">
                  <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3 */}
          {step === "summary" && (
            <div>
              <h2 className="text-lg font-bold text-ink">{t("booking.summaryTitle")}</h2>
              <div className="mt-6 space-y-4 text-sm">
                <SummaryRow label={t("booking.summary.car")}><strong className="text-ink">{car.name}</strong></SummaryRow>
                <SummaryRow label={t("booking.summary.pickup")}>{formatDateTime(pickupIso)} ··· {pickupName}</SummaryRow>
                <SummaryRow label={t("booking.summary.return")}>{formatDateTime(returnIso)} ··· {returnName}</SummaryRow>
                <SummaryRow label={t("booking.summary.duration")}>{t("booking.success.days", { days })}</SummaryRow>
                <SummaryRow label={t("booking.summary.estimatedPrice")}><strong className="text-accent-dark">{formatPrice(estimate)}</strong></SummaryRow>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                {t("booking.summary.finalConfirmed")}
              </p>

              {availabilityError && <ConflictNotice car={car} message={availabilityError} />}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  onClick={() => handleCustomerSubmit(onSubmitCustomer)()}
                  disabled={submitting}
                  className="btn-primary flex-1 py-3.5!"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : t("booking.confirmSubmit")}
                </button>
                <button onClick={() => setStep("customer")} className="btn-outline flex-1 py-3.5!">
                  <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Price sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink">{t("booking.priceEstimate")}</h3>
            <div className="mt-4 rounded-2xl bg-surface p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("booking.sidebar.dailyPrice")}</span>
                <span className="font-semibold text-ink">
                  {hasDiscount ? (
                    <>
                      <span className="mr-1.5 text-sm font-normal text-slate-400 line-through">{formatPrice(car.daily_price)}</span>
                      {formatPrice(effectiveDaily)}
                    </>
                  ) : (
                    formatPrice(effectiveDaily)
                  )}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500">{t("booking.sidebar.duration")}</span>
                {invalidDates ? <span className="text-slate-400">—</span> : <span className="font-semibold text-ink">{t("booking.success.days", { days })}</span>}
              </div>
              <div className="my-3 border-t border-line" />
              {applyDiscount && loyaltySaving > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("booking.sidebar.loyaltyDiscount")}</span>
                    <span className="font-semibold text-emerald-600">−{formatPrice(loyaltySaving)}</span>
                  </div>
                  <div className="my-3 border-t border-line" />
                </>
              )}
              <div className="flex justify-between text-base">
                <span className="font-semibold text-ink">{t("booking.sidebar.total")}</span>
                <span className="text-lg font-extrabold text-accent-dark">{invalidDates ? "—" : formatPrice(discountedEstimate)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {t("booking.sidebar.calcNote", { price: formatPrice(effectiveDaily), days: days || 1 })}
            </p>
            <a
              href="https://wa.me/96170858510"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline mt-4 w-full py-2.5! text-sm"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" /> {t("booking.sidebar.questions")}
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-surface px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}