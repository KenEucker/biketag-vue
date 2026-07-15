type GpsLike =
  | {
      lat?: number | null
      long?: number | null
      lng?: number | null
      alt?: number | null
    }
  | null
  | undefined

/** Compact GPS snapshot for tracing coordinates through the post pipeline. */
export const summarizeTagGps = (gps?: GpsLike) => {
  if (!gps || typeof gps !== 'object') {
    return { hasGps: false, isEmpty: true, lat: null, long: null, alt: null }
  }
  const lat = gps.lat ?? null
  const long = gps.long ?? gps.lng ?? null
  const isEmpty = Object.keys(gps).length === 0
  const hasGps = lat != null && long != null && (lat !== 0 || long !== 0)
  return { hasGps, isEmpty, lat, long, alt: gps.alt ?? null }
}
