import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import buffer from '@turf/buffer'
import { multiPolygon, point, polygon } from '@turf/helpers'

export const feetToKm = (feets: number) => feets * 0.0003048

export const isPointInPolygon = (
  geojson: any,
  gps: { lng: number; lat: number },
  distanceOffInFeet: number,
) => {
  const distanceOffInKilometers = feetToKm(distanceOffInFeet)

  const turfPoint = point([gps.lng, gps.lat])
  const turfPolygon =
    geojson.type === 'MultiPolygon'
      ? multiPolygon(geojson.coordinates)
      : polygon(geojson.coordinates)

  const bufferedPolygon = buffer(turfPolygon, distanceOffInKilometers, { units: 'kilometers' })

  return booleanPointInPolygon(turfPoint, bufferedPolygon)
}
