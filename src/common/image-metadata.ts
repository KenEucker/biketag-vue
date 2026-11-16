import exifr from 'exifr'

/** Metadata is optional: GIFs and other supported images may have no readable EXIF. */
export const readImageMetadata = async (image: Blob) => {
  const buffer = await image.arrayBuffer()
  try {
    // Keep GPS parsing explicit so changes in the general metadata defaults do
    // not silently drop the coordinates used by the found-tag form.
    return await exifr.parse(buffer, { gps: true })
  } catch {
    return undefined
  }
}
