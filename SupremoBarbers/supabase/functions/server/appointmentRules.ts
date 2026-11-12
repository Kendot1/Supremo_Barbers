/**
 * Pure appointment rules shared by the browser and the Edge Function.
 *
 * This file intentionally lives inside the deployable function directory.
 * Supabase bundles an Edge Function in isolation, so imports that walk out of
 * this directory are not available during `supabase functions deploy`.
 */

export const ACTIVE_APPOINTMENT_STATUSES = [
  "pending",
  "approved",
  "confirmed",
  "verified",
  "upcoming",
] as const;

export const TERMINAL_APPOINTMENT_STATUSES = [
  "completed",
  "cancelled",
  "rejected",
] as const;

export type AppointmentStatus =
  | (typeof ACTIVE_APPOINTMENT_STATUSES)[number]
  | (typeof TERMINAL_APPOINTMENT_STATUSES)[number];

const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function isActiveAppointmentStatus(status?: string | null): boolean {
  return Boolean(status && ACTIVE_APPOINTMENT_STATUSES.includes(status as never));
}

export function isTerminalAppointmentStatus(status?: string | null): boolean {
  return Boolean(status && TERMINAL_APPOINTMENT_STATUSES.includes(status as never));
}

/** Parse a date-only value without allowing the host timezone to shift it. */
export function parseDateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }
  return parsed;
}

export function formatDateOnly(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

export function daysUntilAppointment(
  appointmentDate: string,
  now: Date = new Date(),
): number | null {
  const target = parseDateOnly(appointmentDate);
  if (!target) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / DAY_IN_MS);
}

export function isSunday(date: string | Date): boolean {
  const parsed = parseDateOnly(date);
  return parsed?.getDay() === 0;
}

export function hasMinimumNotice(
  appointmentDate: string,
  minimumDays = 2,
  now: Date = new Date(),
): boolean {
  const days = daysUntilAppointment(appointmentDate, now);
  return days !== null && days >= minimumDays;
}

/** Accepts 09:00, 9:00, 09:00 AM, and 9:00pm. */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

export function timeRangesOverlap(
  startA: string,
  durationA: number,
  startB: string,
  durationB: number,
): boolean {
  const firstStart = parseTimeToMinutes(startA);
  const secondStart = parseTimeToMinutes(startB);
  if (
    firstStart === null ||
    secondStart === null ||
    !Number.isFinite(durationA) ||
    !Number.isFinite(durationB) ||
    durationA <= 0 ||
    durationB <= 0
  ) {
    return false;
  }

  const firstEnd = firstStart + durationA;
  const secondEnd = secondStart + durationB;
  return firstStart < secondEnd && firstEnd > secondStart;
}

/** Same-state writes remain idempotent so retries are safe. */
export function isValidAppointmentStatusTransition(
  from: string | null | undefined,
  to: string,
): boolean {
  if (!from || from === to) return true;

  const transitions: Record<string, readonly string[]> = {
    pending: ["approved", "confirmed", "verified", "upcoming", "completed", "cancelled", "rejected"],
    approved: ["confirmed", "verified", "upcoming", "completed", "cancelled", "rejected"],
    confirmed: ["verified", "upcoming", "completed", "cancelled", "rejected"],
    verified: ["confirmed", "upcoming", "completed", "cancelled", "rejected"],
    upcoming: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
    rejected: [],
  };

  return transitions[from]?.includes(to) ?? false;
}

export function isWithinBusinessDay(date: string): boolean {
  const parsed = parseDateOnly(date);
  return parsed !== null && !isSunday(parsed);
}

export const DEFAULT_BOOKING_HORIZON_DAYS = 30;

export const APPOINTMENT_RULES = {
  cancellationNoticeDays: 2,
  rescheduleLimit: 1,
  minuteInMs: MINUTE_IN_MS,
} as const;
