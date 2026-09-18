import type {
  Admin,
  AvailabilityResult,
  Booking,
  BookingCreatePayload,
  BookingCreateResult,
  BookingListResponse,
  Car,
  CarListResponse,
  CarsMeta,
  CompanySettings,
  Customer,
  CustomerWithStats,
  DashboardData,
  Location,
  LoyaltyAccount,
  LoyaltyEarnResult,
  LoyaltyListResponse,
  Paged,
  RentalReport,
  RentalReportData,
  TokenResponse,
} from "@/types";
import { ApiError } from "@/lib/api-error";
import {
  DEMO_ADMIN,
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_BOOKINGS,
  DEMO_CARS,
  DEMO_CUSTOMERS,
  DEMO_LOCATIONS,
  DEMO_LOYALTY,
  DEMO_REPORTS,
  DEMO_SETTINGS,
  DEMO_TOKEN,
} from "@/lib/demo/seed";

const CONFLICT_STATUSES = ["CONFIRMED", "RESERVED", "ACTIVE"];

function requireAuth(options: RequestInit, token?: string | null): void {
  const header = options.headers instanceof Headers ? options.headers.get("Authorization") : null;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : token;
  if (bearer !== DEMO_TOKEN) {
    throw new ApiError(401, "Not authenticated");
  }
}

function parseBody(options: RequestInit): Record<string, any> {
  if (!options.body || typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body) as Record<string, any>;
  } catch {
    return {};
  }
}

function parseQuery(pathname: string): URLSearchParams {
  const index = pathname.indexOf("?");
  return new URLSearchParams(index === -1 ? "" : pathname.slice(index + 1));
}

function pageParams(q: URLSearchParams, defaultSize: number): { page: number; page_size: number } {
  const page = Math.max(1, Number(q.get("page")) || 1);
  const page_size = Math.min(50, Math.max(1, Number(q.get("page_size")) || defaultSize));
  return { page, page_size };
}

function paged<T>(items: T[], q: URLSearchParams, defaultSize: number): Paged<T> & { total: number } {
  const { page, page_size } = pageParams(q, defaultSize);
  const total = items.length;
  return { items: items.slice((page - 1) * page_size, page * page_size), total, page, page_size };
}

function effectiveDaily(car: Car): number {
  return car.discount_daily_price && car.discount_daily_price < car.daily_price ? car.discount_daily_price : car.daily_price;
}

function filterCars(cars: Car[], q: URLSearchParams): Car[] {
  const category = q.get("category");
  const transmission = q.get("transmission");
  const brand = q.get("brand");
  const min = q.get("min_price");
  const max = q.get("max_price");
  const passengers = q.get("passengers");
  return cars.filter((c) => {
    if (c.status === "INACTIVE") return false;
    if (category && c.category !== category) return false;
    if (transmission && c.transmission !== transmission) return false;
    if (brand && c.brand !== brand) return false;
    if (min && effectiveDaily(c) < Number(min)) return false;
    if (max && effectiveDaily(c) > Number(max)) return false;
    if (passengers && c.passengers < Number(passengers)) return false;
    return true;
  });
}

function conflicts(car: Car, pickup: string, ret: string): Booking | null {
  const start = new Date(pickup).getTime();
  const end = new Date(ret).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return (
    DEMO_BOOKINGS.find(
      (b) =>
        b.car_id === car.id &&
        CONFLICT_STATUSES.includes(b.status) &&
        start < new Date(b.return_datetime).getTime() &&
        end > new Date(b.pickup_datetime).getTime(),
    ) ?? null
  );
}

function nextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

let REF_COUNTER = 0;

function estimatePrice(car: Car, pickup: string, ret: string): { days: number; price: number } {
  const ms = new Date(ret).getTime() - new Date(pickup).getTime();
  const days = Math.max(1, Math.round(ms / 86400000));
  let price = days * effectiveDaily(car);
  const weekly = car.weekly_price ? Math.floor(days / 7) * car.weekly_price : 0;
  const monthly = car.monthly_price ? Math.floor(days / 30) * car.monthly_price : 0;
  if (weekly && weekly < price) price = weekly + (days % 7) * effectiveDaily(car);
  if (monthly && monthly < price) price = monthly + (days % 30) * effectiveDaily(car);
  return { days, price };
}

const carOut = (car: Car): Car => ({ ...car, images: [...car.images] });

const bookingOut = (b: Booking): Booking => ({ ...b });

const customerWithStats = (c: Customer): CustomerWithStats => {
  const bookings = DEMO_BOOKINGS.filter((b) => b.customer_id === c.id);
  return {
    ...c,
    total_bookings: bookings.length,
    active_rentals: bookings.filter((b) => b.status === "ACTIVE").length,
    last_booking: bookings.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? null,
  };
};

function seedReportData(): { report_no: string; nr: string; data: RentalReportData } {
  const serial = String(1000 + DEMO_REPORTS.length + REF_COUNTER).slice(1);
  return {
    report_no: `CR-2026-A${serial}`,
    nr: serial,
    data: DEMO_REPORTS[0].data,
  };
}

export async function demoRouter(path: string, options: RequestInit, token?: string | null): Promise<unknown> {
  const q = parseQuery(path);
  const rawPath = path.split("?")[0];
  const segments = rawPath.split("/").filter(Boolean);
  const method = (options.method ?? "GET").toUpperCase();
  const body = parseBody(options);

  // Public: /api/cars
  if (segments[0] === "cars") {
    if (segments[1] === "meta") {
      const visible = DEMO_CARS.filter((c) => c.status !== "INACTIVE");
      const meta: CarsMeta = {
        categories: [...new Set(visible.map((c) => c.category))],
        transmissions: [...new Set(visible.map((c) => c.transmission))],
        brands: [...new Set(visible.map((c) => c.brand))],
        image_angles: [...new Set(visible.flatMap((c) => c.images.map((i) => i.angle)))],
      };
      return meta;
    }
    if (segments[1] === "search") {
      const vis = filterCars(DEMO_CARS, q);
      const result = paged(vis.slice().sort((a, b) => effectiveDaily(a) - effectiveDaily(b)), q, 12);
      return { ...result, items: result.items.map(carOut) } satisfies CarListResponse;
    }
    if (segments[1] && /^\d+$/.test(segments[1])) {
      const car = DEMO_CARS.find((c) => c.id === Number(segments[1]));
      if (!car) throw new ApiError(404, "Car not found");
      return carOut(car);
    }
    if (segments[1] && segments[1] === "similar" && segments[2]) {
      const current = DEMO_CARS.find((c) => c.id === Number(segments[2]));
      if (!current) throw new ApiError(404, "Car not found");
      const limit = Number(q.get("limit")) || 4;
      const same = DEMO_CARS.filter((c) => c.id !== current.id && c.category === current.category && c.status !== "INACTIVE");
      const others = DEMO_CARS.filter((c) => c.id !== current.id && c.category !== current.category && c.status !== "INACTIVE");
      return [...same, ...others].slice(0, limit).map(carOut);
    }
    const visible = filterCars(DEMO_CARS, q);
    const sorted = visible.slice().sort((a, b) => effectiveDaily(a) - effectiveDaily(b));
    const result = paged(sorted, q, 12);
    return { ...result, items: result.items.map(carOut) } satisfies CarListResponse;
  }

  // Public: /api/locations
  if (segments[0] === "locations") {
    return DEMO_LOCATIONS.filter((l) => l.is_active);
  }

  // Public: /api/settings
  if (segments[0] === "settings") {
    return { ...DEMO_SETTINGS } satisfies CompanySettings;
  }

  // Public: /api/bookings
  if (segments[0] === "bookings") {
    if (segments[1] === "check-availability" && method === "POST") {
      const car = DEMO_CARS.find((c) => c.id === Number(body.car_id));
      if (!car) throw new ApiError(404, "Car not found");
      const clash = conflicts(car, body.pickup_datetime, body.return_datetime);
      const result: AvailabilityResult = clash
        ? { available: false, car_id: car.id, message: "This car is not available for the selected dates.", conflicting_booking_reference: clash.booking_reference }
        : { available: true, car_id: car.id, message: "Car is available.", conflicting_booking_reference: null };
      return result;
    }
    if (method === "POST") {
      const payload = body as BookingCreatePayload;
      const car = DEMO_CARS.find((c) => c.id === payload.car_id);
      if (!car) throw new ApiError(404, "Car not found");
      if (car.status !== "AVAILABLE") throw new ApiError(422, "Car is not available for booking");
      const clash = conflicts(car, payload.pickup_datetime, payload.return_datetime);
      if (clash) throw new ApiError(422, `This car is not available for the selected dates. Conflicting booking: ${clash.booking_reference}`);

      let customer = DEMO_CUSTOMERS.find(
        (c) => c.phone_number.toLowerCase() === payload.phone_number.toLowerCase().trim(),
      );
      if (!customer) {
        customer = {
          id: nextId(DEMO_CUSTOMERS),
          full_name: payload.full_name,
          phone_number: payload.phone_number.trim(),
          email: payload.email ?? null,
          created_at: new Date().toISOString(),
        };
        DEMO_CUSTOMERS.push(customer);
      } else {
        customer.full_name = payload.full_name;
        if (payload.email) customer.email = payload.email;
      }

      const { days, price } = estimatePrice(car, payload.pickup_datetime, payload.return_datetime);
      let estimated = price;
      let discountApplied: number | null = null;
      let account: LoyaltyAccount | null = null;
      let pointsEarned = 0;

      if (payload.loyalty_phone) {
        account =
          DEMO_LOYALTY.find((a) => a.phone_number === payload.loyalty_phone) ??
          DEMO_LOYALTY.find((a) => a.phone_number === payload.phone_number) ??
          null;
        if (payload.redeem_discount && account && account.pending_discounts > 0) {
          const discount = Math.round(estimated * 5) / 100;
          estimated -= discount;
          account.pending_discounts -= 1;
          discountApplied = discount;
        }
      }
      if (account) pointsEarned = Math.round(estimated);

      REF_COUNTER += 1;
      const ref = `HB-2026-${String(1000 + DEMO_BOOKINGS.length + REF_COUNTER).slice(1)}`;

      const pickupLoc = DEMO_LOCATIONS.find((l) => l.id === payload.pickup_location_id);
      const returnLoc = DEMO_LOCATIONS.find((l) => l.id === payload.return_location_id);
      const now = new Date().toISOString();
      const booking: Booking = {
        id: nextId(DEMO_BOOKINGS),
        booking_reference: ref,
        customer_id: customer.id,
        car_id: car.id,
        pickup_location_id: payload.pickup_location_id ?? 0,
        return_location_id: payload.return_location_id ?? 0,
        pickup_datetime: payload.pickup_datetime,
        return_datetime: payload.return_datetime,
        rental_days: days,
        estimated_price: estimated,
        final_price: null,
        loyalty_phone: account?.phone_number ?? null,
        points_earned: pointsEarned,
        loyalty_discount_applied: discountApplied,
        status: "PENDING",
        customer_notes: payload.customer_notes ?? null,
        admin_notes: null,
        created_at: now,
        updated_at: now,
        customer_full_name: customer.full_name,
        customer_phone: customer.phone_number,
        customer_email: customer.email,
        car_name: car.name,
        pickup_location_name: pickupLoc?.name ?? "Pickup point",
        return_location_name: returnLoc?.name ?? "Return point",
        pickup_latitude: payload.pickup_custom?.latitude,
        pickup_longitude: payload.pickup_custom?.longitude,
        return_latitude: payload.return_custom?.latitude,
        return_longitude: payload.return_custom?.longitude,
      };
      DEMO_BOOKINGS.push(booking);
      if (account) {
        account.points_balance += pointsEarned;
        account.total_points_earned += pointsEarned;
      }

      const whatsapp = `https://wa.me/${DEMO_SETTINGS.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${customer.full_name}, your booking ${ref} was received. We will confirm shortly.`)}`;
      let loyaltyEarned: LoyaltyEarnResult | null = null;
      if (account) {
        loyaltyEarned = {
          phone_number: account.phone_number,
          loyalty_code: account.loyalty_code,
          points_earned: pointsEarned,
          points_balance: account.points_balance,
        };
      }
      const result: BookingCreateResult = { booking: bookingOut(booking), whatsapp_url: whatsapp, loyalty_earned: loyaltyEarned };
      return result;
    }
    if (segments[1] === "reference" && segments[2]) {
      const booking = DEMO_BOOKINGS.find((b) => b.booking_reference === segments[2]);
      if (!booking) throw new ApiError(404, "Booking not found");
      return bookingOut(booking);
    }
  }

  // Public: /api/loyalty
  if (segments[0] === "loyalty") {
    if (segments[1] === "lookup") {
      const phone = q.get("phone") ?? "";
      const account = DEMO_LOYALTY.find((a) => a.phone_number === phone);
      if (!account) throw new ApiError(404, "No loyalty account found for this number.");
      return { ...account };
    }
    if (segments[1] === "redeem" && method === "POST") {
      const account = DEMO_LOYALTY.find((a) => a.phone_number === body.phone_number);
      if (!account) throw new ApiError(404, "No loyalty account found for this number.");
      if (account.points_balance < 1000) throw new ApiError(422, "Not enough points to redeem a discount.");
      account.points_balance -= 1000;
      account.pending_discounts += 1;
      return { ...account };
    }
  }

  // Admin auth
  if (segments[0] === "admin") {
    if (segments.length === 1) {
      // /api/admin (not used by the app, but harmless)
      throw new ApiError(404, "Not found");
    }

    if (segments[1] === "login" && method === "POST") {
      if (body.email === DEMO_ADMIN_EMAIL && body.password === DEMO_ADMIN_PASSWORD) {
        const result: TokenResponse = { access_token: DEMO_TOKEN, token_type: "bearer", admin: DEMO_ADMIN };
        return result;
      }
      throw new ApiError(401, "Invalid email or password");
    }

    requireAuth(options, token);

    if (segments[1] === "me") {
      return { ...DEMO_ADMIN } satisfies Admin;
    }

    if (segments[1] === "dashboard") {
      const active = DEMO_BOOKINGS.filter((b) => b.status === "ACTIVE");
      const completed = DEMO_BOOKINGS.filter((b) => b.status === "COMPLETED");
      const revenuePool = [...active, ...completed];
      const stats = {
        total_cars: DEMO_CARS.filter((c) => c.status !== "INACTIVE").length,
        available_cars: DEMO_CARS.filter((c) => c.status === "AVAILABLE").length,
        active_rentals: active.length,
        pending_requests: DEMO_BOOKINGS.filter((b) => b.status === "PENDING").length,
        total_customers: DEMO_CUSTOMERS.length,
        monthly_revenue: revenuePool.reduce((sum, b) => sum + (b.final_price ?? b.estimated_price), 0),
      };
      const recent = DEMO_BOOKINGS.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
      const upcoming = DEMO_BOOKINGS
        .filter((b) => b.status === "CONFIRMED" || b.status === "RESERVED")
        .sort((a, b) => a.pickup_datetime.localeCompare(b.pickup_datetime))
        .slice(0, 5);
      const result: DashboardData = {
        stats,
        recent_bookings: recent.map(bookingOut),
        upcoming_rentals: upcoming.map(bookingOut),
        recent_customers: DEMO_CUSTOMERS.map((c) => ({ ...c })),
      };
      return result;
    }

    if (segments[1] === "cars") {
      if (segments[2] && /^\d+$/.test(segments[2])) {
        if (segments[3] === "images") {
          const car = DEMO_CARS.find((c) => c.id === Number(segments[2]));
          if (!car) throw new ApiError(404, "Car not found");
          if (segments[4]) {
            const image = car.images.find((i) => i.id === Number(segments[4]));
            if (!image) throw new ApiError(404, "Image not found");
            if (method === "PUT") {
              if (segments[5] === "main") {
                car.images = car.images.map((i) => ({ ...i, is_main: i.id === image.id }));
              } else {
                const payload = parseBody(options);
                Object.assign(image, { angle: payload.angle ?? image.angle, color_name: payload.color_name ?? image.color_name, color_hex: payload.color_hex ?? image.color_hex, sort_order: payload.sort_order ?? image.sort_order });
              }
              return carOut(car);
            }
            if (method === "DELETE") {
              car.images = car.images.filter((i) => i.id !== image.id);
              return carOut(car);
            }
          }
          if (method === "POST") {
            car.images.push({
              id: nextId(car.images),
              image_url: `/cars/generic_${(car.images.length % 3) + 1}.jpg`,
              angle: q.get("angle") ?? "Front Angle",
              color_name: q.get("color_name") ?? null,
              color_hex: q.get("color_hex") ?? null,
              is_main: car.images.length === 0,
              sort_order: car.images.reduce((max, i) => Math.max(max, i.sort_order), 0) + 1,
            });
            return carOut(car);
          }
          return carOut(car);
        }
        if (method === "GET") {
          const car = DEMO_CARS.find((c) => c.id === Number(segments[2]));
          if (!car) throw new ApiError(404, "Car not found");
          return carOut(car);
        }
        if (method === "PUT") {
          const car = DEMO_CARS.find((c) => c.id === Number(segments[2]));
          if (!car) throw new ApiError(404, "Car not found");
          Object.assign(car, body);
          car.name = `${car.brand} ${car.model}`;
          return carOut(car);
        }
        if (method === "DELETE") {
          const index = DEMO_CARS.findIndex((c) => c.id === Number(segments[2]));
          if (index === -1) throw new ApiError(404, "Car not found");
          DEMO_CARS.splice(index, 1);
          return undefined;
        }
      }
      if (segments[2] === "bulk-price" && method === "POST") {
        let count = 0;
        const target = DEMO_CARS.filter((c) => !q.get("category") || c.category === body.category);
        for (const car of target) {
          if (body.set_price !== undefined) car.daily_price = Number(body.set_price);
          else if (body.percent !== undefined) car.daily_price = Math.round(car.daily_price * (1 + Number(body.percent) / 100));
          if (body.include_weekly_monthly) {
            car.weekly_price = car.weekly_price ? Math.round(car.weekly_price * (1 + Number(body.percent ?? 0) / 100)) : null;
            car.monthly_price = car.monthly_price ? Math.round(car.monthly_price * (1 + Number(body.percent ?? 0) / 100)) : null;
          }
          count += 1;
        }
        return { updated: count, category: body.category ?? null };
      }
      if (segments[2] === "discount" && method === "POST") {
        let count = 0;
        const target = DEMO_CARS.filter((c) => !body.category || c.category === body.category);
        for (const car of target) {
          if (body.remove) car.discount_daily_price = null;
          else if (body.percent !== undefined) car.discount_daily_price = Math.round(car.daily_price * (1 - Number(body.percent) / 100));
          count += 1;
        }
        return { updated: count, category: body.category ?? null };
      }
      if (segments[2] === "images" && segments[3] && method === "DELETE") {
        const imageId = Number(segments[3]);
        for (const car of DEMO_CARS) {
          const index = car.images.findIndex((i) => i.id === imageId);
          if (index !== -1) {
            car.images.splice(index, 1);
            return undefined;
          }
        }
        throw new ApiError(404, "Image not found");
      }
      if (method === "POST") {
        const payload = parseBody(options);
        const car: Car = {
          id: nextId(DEMO_CARS),
          brand: payload.brand ?? "",
          model: payload.model ?? "",
          year: payload.year ?? new Date().getFullYear(),
          category: payload.category ?? "Economy",
          transmission: payload.transmission ?? "Automatic",
          fuel_type: payload.fuel_type ?? "Petrol",
          passengers: payload.passengers ?? 5,
          doors: payload.doors ?? 4,
          luggage_capacity: payload.luggage_capacity ?? 2,
          has_air_conditioning: payload.has_air_conditioning ?? true,
          daily_price: payload.daily_price ?? 0,
          discount_daily_price: payload.discount_daily_price ?? null,
          weekly_price: payload.weekly_price ?? null,
          monthly_price: payload.monthly_price ?? null,
          description: payload.description ?? null,
          status: payload.status ?? "AVAILABLE",
          name: `${payload.brand ?? ""} ${payload.model ?? ""}`.trim(),
          images: [],
        };
        DEMO_CARS.push(car);
        return carOut(car);
      }
      const searchTerm = q.get("search")?.toLowerCase();
      const status = q.get("status");
      let items = DEMO_CARS;
      if (status) items = items.filter((c) => c.status === status);
      if (searchTerm) items = items.filter((c) => c.name.toLowerCase().includes(searchTerm) || c.brand.toLowerCase().includes(searchTerm));
      const sorted = items.slice().sort((a, b) => b.id - a.id);
      const result = paged(sorted.map(carOut), q, 10);
      const response: CarListResponse = result;
      return response;
    }

    if (segments[1] === "bookings") {
      if (segments[2] === "due-returns") {
        const hours = Number(q.get("hours")) || 24;
        const horizon = new Date(Date.now() + hours * 3600000);
        return DEMO_BOOKINGS.filter(
          (b) => b.status === "ACTIVE" && new Date(b.return_datetime) <= horizon,
        ).map(bookingOut);
      }
      if (segments[2] && /^\d+$/.test(segments[2])) {
        const booking = DEMO_BOOKINGS.find((b) => b.id === Number(segments[2]));
        if (!booking) throw new ApiError(404, "Booking not found");
        if (method === "PUT") {
          const payload = parseBody(options);
          const nextStatus = payload.status ?? booking.status;
          if (!["PENDING", "CONFIRMED", "RESERVED", "ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"].includes(nextStatus)) {
            throw new ApiError(422, "Invalid status");
          }
          if (["COMPLETED", "CANCELLED", "REJECTED"].includes(nextStatus)) {
            const car = DEMO_CARS.find((c) => c.id === booking.car_id);
            if (car && car.status === "RENTED") car.status = "AVAILABLE";
          }
          if (nextStatus === "ACTIVE") {
            const car = DEMO_CARS.find((c) => c.id === booking.car_id);
            if (car) car.status = "RENTED";
          }
          booking.status = nextStatus;
          if (payload.final_price !== undefined) booking.final_price = payload.final_price;
          if (payload.admin_notes !== undefined) booking.admin_notes = payload.admin_notes;
          booking.updated_at = new Date().toISOString();
        }
        return bookingOut(booking);
      }
      const searchTerm = q.get("search")?.toLowerCase();
      const status = q.get("status");
      let items = DEMO_BOOKINGS;
      if (status) items = items.filter((b) => b.status === status);
      if (searchTerm)
        items = items.filter(
          (b) => b.booking_reference.toLowerCase().includes(searchTerm) || b.customer_full_name.toLowerCase().includes(searchTerm),
        );
      const sorted = items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
      const result = paged(sorted.map(bookingOut), q, 10) as unknown as BookingListResponse;
      return result;
    }

    if (segments[1] === "customers") {
      if (segments[2] && /^\d+$/.test(segments[2])) {
        const customer = DEMO_CUSTOMERS.find((c) => c.id === Number(segments[2]));
        if (!customer) throw new ApiError(404, "Customer not found");
        const bookings = DEMO_BOOKINGS.filter((b) => b.customer_id === customer.id).map(bookingOut);
        return { customer: customerWithStats(customer), bookings };
      }
      const searchTerm = q.get("search")?.toLowerCase();
      let items = DEMO_CUSTOMERS;
      if (searchTerm)
        items = items.filter(
          (c) => c.full_name.toLowerCase().includes(searchTerm) || c.phone_number.includes(searchTerm) || (c.email ?? "").toLowerCase().includes(searchTerm),
        );
      const sorted = items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
      return paged(sorted.map(customerWithStats), q, 10);
    }

    if (segments[1] === "locations") {
      if (segments[2] && /^\d+$/.test(segments[2])) {
        const location = DEMO_LOCATIONS.find((l) => l.id === Number(segments[2]));
        if (!location) throw new ApiError(404, "Location not found");
        if (method === "PUT") {
          Object.assign(location, parseBody(options));
          return { ...location };
        }
        if (method === "DELETE") {
          const index = DEMO_LOCATIONS.findIndex((l) => l.id === Number(segments[2]));
          DEMO_LOCATIONS.splice(index, 1);
          return undefined;
        }
        return { ...location };
      }
      if (method === "POST") {
        const payload = parseBody(options);
        if (DEMO_LOCATIONS.some((l) => l.name.toLowerCase() === String(payload.name ?? "").toLowerCase())) {
          throw new ApiError(409, "Location already exists");
        }
        const location: Location = {
          id: nextId(DEMO_LOCATIONS),
          name: payload.name,
          address: payload.address ?? null,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          is_custom: false,
          is_active: payload.is_active ?? true,
        };
        DEMO_LOCATIONS.push(location);
        return { ...location };
      }
      return DEMO_LOCATIONS.map((l) => ({ ...l }));
    }

    if (segments[1] === "loyalty") {
      const searchTerm = q.get("search")?.toLowerCase();
      let items = DEMO_LOYALTY;
      if (searchTerm)
        items = items.filter(
          (a) => a.phone_number.toLowerCase().includes(searchTerm) || a.loyalty_code.toLowerCase().includes(searchTerm),
        );
      const sorted = items.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
      const result = paged(sorted.map((a) => ({ ...a })), q, 10) as unknown as LoyaltyListResponse;
      result.total_points = DEMO_LOYALTY.reduce((sum, a) => sum + a.points_balance, 0);
      return result;
    }

    if (segments[1] === "reports") {
      if (segments[2] && /^\d+$/.test(segments[2])) {
        const report = DEMO_REPORTS.find((r) => r.id === Number(segments[2]));
        if (!report) throw new ApiError(404, "Report not found");
        if (method === "PUT") {
          const payload = parseBody(options);
          Object.assign(report, payload);
          report.updated_at = new Date().toISOString();
        }
        if (method === "DELETE") {
          const index = DEMO_REPORTS.findIndex((r) => r.id === Number(segments[2]));
          DEMO_REPORTS.splice(index, 1);
          return undefined;
        }
        return { ...report, data: { ...report.data } };
      }
      if (method === "POST") {
        const payload = parseBody(options);
        const serial = String(1000 + DEMO_REPORTS.length + REF_COUNTER).slice(1);
        const now = new Date().toISOString();
        const report: RentalReport = {
          id: nextId(DEMO_REPORTS),
          report_no: `CR-2026-A${serial}`,
          nr: serial,
          report_date: payload.report_date ?? new Date().toISOString().slice(0, 10),
          client_name: payload.client_name ?? null,
          client_phone: payload.client_phone ?? null,
          data: (payload.data ?? seedReportData().data) as RentalReportData,
          created_at: now,
          updated_at: now,
        };
        DEMO_REPORTS.push(report);
        return { ...report, data: { ...report.data } };
      }
      const searchTerm = q.get("search")?.toLowerCase();
      let items = DEMO_REPORTS;
      if (searchTerm)
        items = items.filter(
          (r) => r.report_no.toLowerCase().includes(searchTerm) || (r.client_name ?? "").toLowerCase().includes(searchTerm),
        );
      const sorted = items.slice().sort((a, b) => b.report_date.localeCompare(a.report_date));
      const result = paged(sorted.map((r) => ({ ...r, data: { ...r.data } })), q, 10);
      return result;
    }

    if (segments[1] === "settings") {
      if (method === "PUT") {
        Object.assign(DEMO_SETTINGS, parseBody(options));
      }
      return { ...DEMO_SETTINGS } satisfies CompanySettings;
    }

    throw new ApiError(404, "Not found");
  }

  throw new ApiError(404, "Not found");
}