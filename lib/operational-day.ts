/** La jornada operativa usa la fecha de Colombia, independientemente del servidor. */
export function operationalDay(date = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return { day, inicio: new Date(`${day}T00:00:00-05:00`), fin: new Date(`${day}T23:59:59.999-05:00`) };
}

export function plateVariants(plate: string) {
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 6 ? [clean, `${clean.slice(0, 3)}-${clean.slice(3)}`] : [clean];
}
