/** Fictional NMRL schedule. Never use as public-transport travel information. */
export function scheduleFor(id: string) {
  const seed = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { first: 360 + (seed % 4) * 5, last: 1320, headway: 6 + seed % 5 };
}

export function istMinutes(now: Date): number {
  return (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
}

export function clockLabel(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

export function departures(id: string, minutes: number) {
  const { first, last, headway } = scheduleFor(id);
  const final = first + Math.floor((last - first) / headway) * headway;
  const tomorrow = minutes > final;
  const next = tomorrow ? first : first + Math.max(0, Math.ceil((minutes - first) / headway)) * headway;
  return { first, last: final, headway, tomorrow, upcoming: [next, next + headway, next + 2 * headway].filter(value => value <= final) };
}
