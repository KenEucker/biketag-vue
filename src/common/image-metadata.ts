import exifr from 'exifr'

/** Metadata is optional: GIFs and other supported images may have no readable EXIF. */
export const readImageMetadata = async (image: Blob) => {
  const buffer = await image.arrayBuffer()
  const [metadata, gps] = await Promise.all([
    exifr.parse(buffer).catch(() => undefined),
    exifr.gps(buffer).catch(() => undefined),
  ])

  if (!metadata && !gps) return undefined

  return { ...(metadata ?? {}), ...(gps ?? {}) }
}
