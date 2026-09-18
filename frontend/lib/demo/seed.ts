import type {
  Admin,
  Booking,
  Car,
  CompanySettings,
  Customer,
  Location,
  LoyaltyAccount,
  RentalReport,
} from "@/types";

export const DEMO_ADMIN_EMAIL = "admin@alhalabirent.com";
export const DEMO_ADMIN_PASSWORD = "Admin@2026";

export const DEMO_ADMIN: Admin = {
  id: 1,
  email: DEMO_ADMIN_EMAIL,
  full_name: "System Administrator",
  is_active: true,
};

export const DEMO_TOKEN = "demo-admin-token";

export const DEMO_SETTINGS: CompanySettings = {
  company_name: "Al Halabi Rent",
  logo_url: null,
  phone_number: "+961 00 000 000",
  whatsapp_number: "96170858510",
  email: "info@alhalabirent.com",
  address: "Beirut, Lebanon",
  working_hours: "Mon - Sat: 9:00 AM - 6:00 PM",
  currency: "$",
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
};

export const DEMO_LOCATIONS: Location[] = [
  { id: 1, name: "Dora Office", address: "Dora, Beirut", latitude: 33.8938, longitude: 35.5583, is_custom: false, is_active: true },
  { id: 2, name: "Aley Office", address: "Aley, Mount Lebanon", latitude: 33.8106, longitude: 35.5972, is_custom: false, is_active: true },
  { id: 3, name: "Beirut Airport Rafic Hariri", address: "Rafic Hariri International Airport, Beirut", latitude: 33.8209, longitude: 35.4884, is_custom: false, is_active: true },
];

interface CarSeed {
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuel_type: string;
  passengers: number;
  doors: number;
  luggage_capacity: number;
  daily_price: number;
  weekly_price: number | null;
  monthly_price: number | null;
  description: string;
  status: Car["status"];
}

const CAR_SEEDS: CarSeed[] = [
  { brand: "Toyota", model: "Corolla", year: 2022, category: "Sedan", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 4, luggage_capacity: 2, daily_price: 40, weekly_price: 250, monthly_price: 800, description: "Comfortable and fuel-efficient sedan, perfect for city trips.", status: "AVAILABLE" },
  { brand: "Toyota", model: "Camry", year: 2022, category: "Sedan", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 4, luggage_capacity: 3, daily_price: 55, weekly_price: 350, monthly_price: 1100, description: "Spacious mid-size sedan with a smooth ride and premium comfort.", status: "AVAILABLE" },
  { brand: "Hyundai", model: "Elantra", year: 2021, category: "Economy", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 4, luggage_capacity: 2, daily_price: 35, weekly_price: 220, monthly_price: 700, description: "Budget-friendly and reliable car for economical travel.", status: "AVAILABLE" },
  { brand: "Kia", model: "Sportage", year: 2022, category: "SUV", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 5, luggage_capacity: 3, daily_price: 70, weekly_price: 440, monthly_price: 1500, description: "Modern compact SUV with plenty of space and a confident drive.", status: "AVAILABLE" },
  { brand: "Hyundai", model: "Tucson", year: 2023, category: "SUV", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 5, luggage_capacity: 3, daily_price: 75, weekly_price: 470, monthly_price: 1600, description: "Stylish and capable SUV suited for both city and mountain roads.", status: "AVAILABLE" },
  { brand: "BMW", model: "X5", year: 2023, category: "Luxury", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 5, luggage_capacity: 4, daily_price: 180, weekly_price: 1150, monthly_price: 4000, description: "Luxurious German SUV delivering power, comfort and prestige.", status: "AVAILABLE" },
  { brand: "Audi", model: "A4", year: 2022, category: "Luxury", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 4, luggage_capacity: 3, daily_price: 140, weekly_price: 880, monthly_price: 3000, description: "Elegant executive saloon with refined interior and technology.", status: "AVAILABLE" },
  { brand: "Mercedes-Benz", model: "C200", year: 2022, category: "Luxury", transmission: "Automatic", fuel_type: "Petrol", passengers: 5, doors: 4, luggage_capacity: 3, daily_price: 160, weekly_price: 1000, monthly_price: 3400, description: "Premium German saloon offering exceptional comfort and class.", status: "AVAILABLE" },
  { brand: "Ford", model: "Mustang", year: 2023, category: "Sports", transmission: "Automatic", fuel_type: "Petrol", passengers: 4, doors: 2, luggage_capacity: 2, daily_price: 220, weekly_price: 1400, monthly_price: 4800, description: "Iconic American sports car with breathtaking performance and style.", status: "AVAILABLE" },
  { brand: "Porsche", model: "Boxster", year: 2022, category: "Sports", transmission: "Automatic", fuel_type: "Petrol", passengers: 2, doors: 2, luggage_capacity: 1, daily_price: 300, weekly_price: 1900, monthly_price: 6500, description: "Open-top roadster engineered for pure driving pleasure.", status: "AVAILABLE" },
  { brand: "Toyota", model: "Hiace", year: 2022, category: "Van", transmission: "Manual", fuel_type: "Diesel", passengers: 12, doors: 4, luggage_capacity: 6, daily_price: 90, weekly_price: 560, monthly_price: 1900, description: "Reliable passenger van ideal for groups and airport transfers.", status: "AVAILABLE" },
  { brand: "Renault", model: "Trafic", year: 2021, category: "Van", transmission: "Manual", fuel_type: "Diesel", passengers: 9, doors: 4, luggage_capacity: 5, daily_price: 80, weekly_price: 500, monthly_price: 1700, description: "Practical and spacious van for family trips and business needs.", status: "MAINTENANCE" },
  { brand: "Volkswagen", model: "Golf", year: 2021, category: "Economy", transmission: "Manual", fuel_type: "Diesel", passengers: 5, doors: 5, luggage_capacity: 3, daily_price: 38, weekly_price: 240, monthly_price: 760, description: "German engineering in a compact hatchback - fun and efficient.", status: "AVAILABLE" },
  { brand: "Nissan", model: "Pathfinder", year: 2022, category: "SUV", transmission: "Automatic", fuel_type: "Petrol", passengers: 7, doors: 5, luggage_capacity: 4, daily_price: 85, weekly_price: 530, monthly_price: 1800, description: "Large 7-seater SUV built for families and long journeys.", status: "AVAILABLE" },
];

const CAR_ANGLES = [
  { suffix: "_1", angle: "Front Angle" },
  { suffix: "_side", angle: "Side" },
  { suffix: "_detail", angle: "Detail" },
];

export const DEMO_CARS: Car[] = CAR_SEEDS.map((seed, idx) => ({
  id: idx + 1,
  brand: seed.brand,
  model: seed.model,
  year: seed.year,
  category: seed.category,
  transmission: seed.transmission,
  fuel_type: seed.fuel_type,
  passengers: seed.passengers,
  doors: seed.doors,
  luggage_capacity: seed.luggage_capacity,
  has_air_conditioning: true,
  daily_price: seed.daily_price,
  discount_daily_price: idx === 0 ? 35 : null,
  weekly_price: seed.weekly_price,
  monthly_price: seed.monthly_price,
  description: seed.description,
  status: seed.status,
  name: `${seed.brand} ${seed.model}`,
  images: CAR_ANGLES.map((a, order) => ({
    id: idx * 10 + order + 1,
    image_url: `/cars/${seed.category.toLowerCase()}_${idx + 1}${a.suffix}.jpg`,
    angle: a.angle,
    color_name: null,
    color_hex: null,
    is_main: order === 0,
    sort_order: order,
  })),
}));

export const DEMO_CUSTOMERS: Customer[] = [
  { id: 1, full_name: "Ali Ahmad", phone_number: "+96170123456", email: "ali.ahmad@example.com", created_at: "2026-08-02T10:15:00Z" },
  { id: 2, full_name: "Fatima Zein", phone_number: "+96170345678", email: "fatima.zein@example.com", created_at: "2026-08-19T13:40:00Z" },
  { id: 3, full_name: "Hassan Khaled", phone_number: "+96171234567", email: null, created_at: "2026-09-01T09:05:00Z" },
  { id: 4, full_name: "Rana El-Sayed", phone_number: "+96176123456", email: "rana.elsayed@example.com", created_at: "2026-09-10T16:30:00Z" },
];

export const DEMO_BOOKINGS: Booking[] = [
  {
    id: 1, booking_reference: "HB-2026-0001", customer_id: 1, car_id: 2,
    pickup_location_id: 1, return_location_id: 1,
    pickup_datetime: "2026-09-05T09:00:00", return_datetime: "2026-09-08T09:00:00",
    rental_days: 3, estimated_price: 165, final_price: 165,
    loyalty_phone: "+96170123456", points_earned: 0, loyalty_discount_applied: null,
    status: "COMPLETED", customer_notes: null, admin_notes: null,
    created_at: "2026-09-02T11:00:00Z", updated_at: "2026-09-08T10:00:00Z",
    customer_full_name: "Ali Ahmad", customer_phone: "+96170123456", customer_email: "ali.ahmad@example.com",
    car_name: "Toyota Camry", pickup_location_name: "Dora Office", return_location_name: "Dora Office",
  },
  {
    id: 2, booking_reference: "HB-2026-0002", customer_id: 2, car_id: 5,
    pickup_location_id: 2, return_location_id: 3,
    pickup_datetime: "2026-09-12T10:00:00", return_datetime: "2026-09-15T10:00:00",
    rental_days: 3, estimated_price: 225, final_price: null,
    loyalty_phone: "+96170345678", points_earned: 225, loyalty_discount_applied: null,
    status: "CONFIRMED", customer_notes: "Airport drop-off at the airport office.", admin_notes: null,
    created_at: "2026-09-10T15:20:00Z", updated_at: "2026-09-11T08:00:00Z",
    customer_full_name: "Fatima Zein", customer_phone: "+96170345678", customer_email: "fatima.zein@example.com",
    car_name: "Hyundai Tucson", pickup_location_name: "Aley Office", return_location_name: "Beirut Airport Rafic Hariri",
  },
  {
    id: 3, booking_reference: "HB-2026-0003", customer_id: 3, car_id: 1,
    pickup_location_id: 1, return_location_id: 1,
    pickup_datetime: "2026-09-16T09:00:00", return_datetime: "2026-09-21T09:00:00",
    rental_days: 5, estimated_price: 200, final_price: null,
    loyalty_phone: null, points_earned: 0, loyalty_discount_applied: null,
    status: "ACTIVE", customer_notes: null, admin_notes: "Deposit collected at pickup.",
    created_at: "2026-09-15T18:45:00Z", updated_at: "2026-09-16T09:30:00Z",
    customer_full_name: "Hassan Khaled", customer_phone: "+96171234567", customer_email: null,
    car_name: "Toyota Corolla", pickup_location_name: "Dora Office", return_location_name: "Dora Office",
  },
  {
    id: 4, booking_reference: "HB-2026-0004", customer_id: 4, car_id: 8,
    pickup_location_id: 3, return_location_id: 1,
    pickup_datetime: "2026-09-20T12:00:00", return_datetime: "2026-09-22T12:00:00",
    rental_days: 2, estimated_price: 320, final_price: null,
    loyalty_phone: null, points_earned: 0, loyalty_discount_applied: null,
    status: "PENDING", customer_notes: "Child seat requested.", admin_notes: null,
    created_at: "2026-09-17T08:10:00Z", updated_at: "2026-09-17T08:10:00Z",
    customer_full_name: "Rana El-Sayed", customer_phone: "+96176123456", customer_email: "rana.elsayed@example.com",
    car_name: "Mercedes-Benz C200", pickup_location_name: "Beirut Airport Rafic Hariri", return_location_name: "Dora Office",
  },
  {
    id: 5, booking_reference: "HB-2026-0005", customer_id: 1, car_id: 6,
    pickup_location_id: 1, return_location_id: 3,
    pickup_datetime: "2026-09-25T09:00:00", return_datetime: "2026-09-30T09:00:00",
    rental_days: 5, estimated_price: 900, final_price: null,
    loyalty_phone: "+96170123456", points_earned: 900, loyalty_discount_applied: null,
    status: "RESERVED", customer_notes: null, admin_notes: null,
    created_at: "2026-09-16T14:00:00Z", updated_at: "2026-09-16T14:00:00Z",
    customer_full_name: "Ali Ahmad", customer_phone: "+96170123456", customer_email: "ali.ahmad@example.com",
    car_name: "BMW X5", pickup_location_name: "Dora Office", return_location_name: "Beirut Airport Rafic Hariri",
  },
  {
    id: 6, booking_reference: "HB-2026-0006", customer_id: 2, car_id: 13,
    pickup_location_id: 2, return_location_id: 2,
    pickup_datetime: "2026-10-01T10:00:00", return_datetime: "2026-10-08T10:00:00",
    rental_days: 7, estimated_price: 266, final_price: null,
    loyalty_phone: "+96170345678", points_earned: 266, loyalty_discount_applied: null,
    status: "CONFIRMED", customer_notes: null, admin_notes: null,
    created_at: "2026-09-18T09:00:00Z", updated_at: "2026-09-18T09:00:00Z",
    customer_full_name: "Fatima Zein", customer_phone: "+96170345678", customer_email: "fatima.zein@example.com",
    car_name: "Volkswagen Golf", pickup_location_name: "Aley Office", return_location_name: "Aley Office",
  },
];

export const DEMO_LOYALTY: LoyaltyAccount[] = [
  { id: 1, phone_number: "+96170123456", loyalty_code: "AHL-000123", points_balance: 1500, total_points_earned: 2400, pending_discounts: 1, created_at: "2026-08-02T10:15:00Z" },
  { id: 2, phone_number: "+96170345678", loyalty_code: "AHL-000456", points_balance: 250, total_points_earned: 600, pending_discounts: 0, created_at: "2026-08-19T13:40:00Z" },
];

export const DEMO_REPORTS: RentalReport[] = [
  {
    id: 1,
    report_no: "CR-2026-A0001",
    nr: "0001",
    report_date: "2026-09-16",
    client_name: "Ali Ahmad",
    client_phone: "+96170123456",
    data: {
      date: "2026-09-16",
      rental_type: "SelfService",
      guarantee_name: "N/A",
      renter: {
        renters_name: "Ali Ahmad",
        mothers_name: "Fatima Ahmad",
        fathers_name: "Ali Ahmad",
        nationality: "Lebanese",
        birth_date: "1990-05-12",
        birth_place: "Beirut",
        phone: "+96170123456",
        local_address: "Beirut, Hamra, Lebanon",
        driving_license_no: "LB123456",
        license_issue_date: "2018-05-12",
        license_issue_place: "Beirut",
        license_expiry_date: "2028-05-12",
      },
      additional_drivers: [
        { driver_name: "Ali Hassan", license_no: "LB654321", expiry_date: "2027-04-10", issue_date: "2017-04-10", issue_place: "Beirut" },
      ],
      vehicle: {
        plate_no: "B123456",
        model: "Toyota Corolla",
        car_type: "Sedan",
        color: "White",
        manufacture_year: "2022",
        frame_no: "JTDBR32E702345678",
        engine_no: "2ZR1234567",
      },
      delivery: {
        in: { desc: "IN", km: "", date: "2026-09-16", time: "" },
        out: { desc: "OUT", km: "", date: "2026-09-21", time: "10:00 AM" },
      },
      charges: { days: "5", rent_per_day: "40", total_rent: "200", vat: "15", total: "230", prepayment: "50", balance: "180", deposit: "300", payment_method: "Cash" },
      signatures: { renter_signature: "Ali Ahmad", company_signature: "" },
    },
    created_at: "2026-09-16T12:00:00Z",
    updated_at: "2026-09-16T12:00:00Z",
  },
];

