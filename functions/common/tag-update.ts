import type { Tag } from 'biketag'
import { foundEditFields, mysteryEditFields } from '../../src/common/tag-edits'

/** Prepare an explicitly requested metadata edit, leaving general updates unrestricted. */
export const prepareTagMetadataUpdate = (
  input: Partial<Tag>,
  existing: Tag,
  game: string,
  source: string,
): Partial<Tag> & Pick<Tag, 'game' | 'tagnumber'> => {
  if (input.game && input.game !== game) throw new Error('Tag game does not match request game')
  for (const field of ['foundImage', 'mysteryImage'] as const) {
    if (input[field]) throw new Error('Image uploads are not supported when editing tag metadata')
  }
  for (const field of ['foundImageUrl', 'mysteryImageUrl'] as const) {
    if (input[field] !== undefined && input[field] !== existing[field]) {
      throw new Error(`${field} does not match tag #${existing.tagnumber}`)
    }
  }
  const changes = Object.fromEntries(
    [...mysteryEditFields, ...foundEditFields]
      .filter((field) => input[field] !== undefined)
      .map((field) => [field, input[field]]),
  )
  // The AWS adapter treats ANY image URL as an upload/move, even an unchanged URL.
  // Its metadata branch loads and merges the existing record itself.
  return source === 'aws'
    ? { game, tagnumber: existing.tagnumber, ...changes }
    : { ...existing, ...changes, game, tagnumber: existing.tagnumber }
}
