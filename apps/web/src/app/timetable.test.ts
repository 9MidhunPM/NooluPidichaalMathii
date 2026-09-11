import { expect, test } from "vitest";
import { clockLabel, departures, istMinutes, scheduleFor } from "./timetable";

test("IST wraps into the following day independently of browser timezone", () => {
  expect(istMinutes(new Date("2026-09-12T20:00:00Z"))).toBe(90);
  expect(clockLabel(90)).toBe("01:30");
});
test("departure grid includes opening and closing but never after closing", () => {
  const opening = scheduleFor("line-1").first;
  const before = departures("line-1", opening - 1);
  expect(before.upcoming[0]).toBe(opening);
  expect(departures("line-1", before.last).upcoming).toEqual([before.last]);
  expect(departures("line-1", before.last + 1).tomorrow).toBe(true);
  expect(departures("line-1", before.last + 1).upcoming[0]).toBe(opening);
});
test("different services have stable schedules", () => {
  expect(scheduleFor("line-1")).toEqual(scheduleFor("line-1"));
  expect(scheduleFor("line-1")).not.toEqual(scheduleFor("line-2"));
});
