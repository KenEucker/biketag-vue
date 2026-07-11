export const parseCurrentRound = (value: unknown): number | undefined => {
  const parsed = parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export const resolveCurrentRound = (
  payload: Record<string, unknown>,
  imageKey?: string,
  imageType?: 'found' | 'mystery',
): number | undefined => {
  const fromPayload = parseCurrentRound(payload.currentRound)
  if (fromPayload !== undefined) return fromPayload

  if (!imageKey?.length) return undefined

  const tagnumberMatch = imageKey.match(/-tag-(\d+)--(?:found|mystery|rejected)/i)
  const tagnumber = tagnumberMatch ? parseInt(tagnumberMatch[1], 10) : undefined
  if (tagnumber === undefined) return undefined

  if (imageType === 'mystery') return tagnumber - 1
  if (imageType === 'found') return tagnumber

  return tagnumber
}
