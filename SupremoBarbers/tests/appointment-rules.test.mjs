import test from "node:test";
import assert from "node:assert/strict";
import {
  hasMinimumNotice,
  isActiveAppointmentStatus,
  isValidAppointmentStatusTransition,
  parseTimeToMinutes,
  timeRangesOverlap,
} from "../src/utils/appointmentRules.ts";

const now = new Date(2026, 9, 14);

test("appointment time parsing supports 24-hour and meridiem formats", () => {
  assert.equal(parseTimeToMinutes("09:30"), 570);
  assert.equal(parseTimeToMinutes("9:30 PM"), 1290);
  assert.equal(parseTimeToMinutes("12:00 AM"), 0);
  assert.equal(parseTimeToMinutes("25:00"), null);
});

test("active appointment statuses participate in availability checks", () => {
  assert.equal(isActiveAppointmentStatus("pending"), true);
  assert.equal(isActiveAppointmentStatus("verified"), true);
  assert.equal(isActiveAppointmentStatus("completed"), false);
  assert.equal(isActiveAppointmentStatus("cancelled"), false);
});

test("overlapping service durations are rejected while adjacent slots remain valid", () => {
  assert.equal(timeRangesOverlap("10:00", 60, "10:30", 30), true);
  assert.equal(timeRangesOverlap("10:00", 30, "10:30", 30), false);
});

test("customer cancellation and rescheduling retain the two-day notice rule", () => {
  assert.equal(hasMinimumNotice("2026-10-16", 2, now), true);
  assert.equal(hasMinimumNotice("2026-10-15", 2, now), false);
});

test("status transitions reject reopening terminal appointments", () => {
  assert.equal(isValidAppointmentStatusTransition("pending", "confirmed"), true);
  assert.equal(isValidAppointmentStatusTransition("confirmed", "completed"), true);
  assert.equal(isValidAppointmentStatusTransition("completed", "confirmed"), false);
  assert.equal(isValidAppointmentStatusTransition("cancelled", "pending"), false);
});
