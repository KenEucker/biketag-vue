type GpsLike =
  | {
      lat?: number | null
      long?: number | null
      lng?: number | null
      alt?: number | null
    }
  | null
  | undefined

/** True when both coordinates are present and represent finite numbers. */
export const hasGpsCoordinates = (lat: unknown, long: unknown): boolean => {
  const isCoordinate = (value: unknown) =>
    value != null &&
    !(typeof value === 'string' && value.trim() === '') &&
    Number.isFinite(Number(value))

  return isCoordinate(lat) && isCoordinate(long) && (Number(lat) !== 0 || Number(long) !== 0)
}

/** Compact GPS snapshot for tracing coordinates through the post pipeline. */
export const summarizeTagGps = (gps?: GpsLike) => {
  if (!gps || typeof gps !== 'object') {
    return { hasGps: false, isEmpty: true, lat: null, long: null, alt: null }
  }
  const lat = gps.lat ?? null
  const long = gps.long ?? gps.lng ?? null
  const isEmpty = Object.keys(gps).length === 0
  const hasGps = hasGpsCoordinates(lat, long)
  return { hasGps, isEmpty, lat, long, alt: gps.alt ?? null }
}
