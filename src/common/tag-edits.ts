import type { Tag } from 'biketag'

export const mysteryEditFields = ['mysteryPlayer', 'mysteryTime', 'hint'] as const
export const foundEditFields = ['foundPlayer', 'foundTime', 'foundLocation', 'gps'] as const

/** The latest play shows the current mystery alongside the previous round's find. */
export const mergeTagsForEdit = (current: Tag, previous?: Tag): Tag => ({
  ...current,
  foundPlayer: previous?.foundPlayer ?? '',
  foundTime: previous?.foundTime ?? 0,
  foundLocation: previous?.foundLocation ?? '',
  foundImageUrl: previous?.foundImageUrl ?? '',
  gps: previous?.gps ?? current.gps,
})

/** Keep display-only image URLs and the other round's fields out of update requests. */
export const getTagEditUpdates = (
  current: Tag,
  previous: Tag | undefined,
  edits: Partial<Tag>,
): Partial<Tag>[] => {
  const updates: Partial<Tag>[] = []
  const addUpdate = (original: Tag | undefined, fields: readonly (keyof Tag)[]) => {
    if (!original) return
    const changes = Object.fromEntries(
      fields
        .filter(
          (field) =>
            edits[field] !== undefined &&
            JSON.stringify(edits[field]) !== JSON.stringify(original[field]),
        )
        .map((field) => [field, edits[field]]),
    )
    if (Object.keys(changes).length) {
      updates.push({ game: current.game, tagnumber: original.tagnumber, ...changes })
    }
  }
  addUpdate(current, mysteryEditFields)
  addUpdate(previous, foundEditFields)
  return updates
}
