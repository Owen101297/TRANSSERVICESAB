import assert from "node:assert/strict";
import test from "node:test";
import { operationalDay, plateVariants } from "../lib/operational-day.ts";
test("la jornada conserva la fecha de Colombia cuando el servidor cambia de día UTC", () => {
  const bounds = operationalDay(new Date("2026-10-06T03:00:00Z"));
  assert.equal(bounds.day, "2026-10-05");
  assert.equal(bounds.inicio.toISOString(), "2026-10-05T05:00:00.000Z");
  assert.equal(bounds.fin.toISOString(), "2026-10-06T04:59:59.999Z");
  assert.deepEqual(plateVariants("abc-123"), ["ABC123", "ABC-123"]);
});
