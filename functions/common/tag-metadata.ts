import { tagMetadataFields, type TagMetadataType } from '../../src/common/tag-metadata'

export const encodeTagMetadata = (type: TagMetadataType, tag: Record<string, unknown>): string => {
  const data = Object.fromEntries(
    Object.entries(tagMetadataFields[type]).map(([key, field]) => [key, tag[field]]),
  )
  return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64')
}
