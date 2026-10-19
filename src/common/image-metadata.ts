import exifr from 'exifr'

/** Metadata is optional: GIFs and other supported images may have no readable EXIF. */
export const readImageMetadata = async (image: Blob) => {
  const buffer = await image.arrayBuffer()
  try {
    return await exifr.parse(buffer)
  } catch {
    return undefined
  }
}
