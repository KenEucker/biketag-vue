/** Convert legacy millisecond timestamps to the Unix seconds used by BikeTag tags. */
export const toUnixSeconds = (timestamp: number): number => {
  if (!Number.isFinite(timestamp)) return timestamp
  return Math.abs(timestamp) >= 100_000_000_000 ? Math.trunc(timestamp / 1000) : timestamp
}

export const normalizeTagTimestamps = <T extends { mysteryTime?: number; foundTime?: number }>(
  tag: T,
): T => {
  const normalized = { ...tag }
  if (typeof normalized.mysteryTime === 'number') {
    normalized.mysteryTime = toUnixSeconds(normalized.mysteryTime)
  }
  if (typeof normalized.foundTime === 'number') {
    normalized.foundTime = toUnixSeconds(normalized.foundTime)
  }
  return normalized
}
