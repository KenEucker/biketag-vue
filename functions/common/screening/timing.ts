import { MYSTERY_UPLOAD_DELAY_SECONDS } from './config'

export const getSecondsSinceTimestamp = (timestampSeconds: number, nowMs = Date.now()): number => {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return MYSTERY_UPLOAD_DELAY_SECONDS
  return Math.max(0, Math.floor((nowMs - timestampSeconds * 1000) / 1000))
}

export const getMysteryUploadRemainingSeconds = (
  foundImageUploadTimestampSeconds?: number,
  nowMs = Date.now(),
): number => {
  if (!foundImageUploadTimestampSeconds) return MYSTERY_UPLOAD_DELAY_SECONDS
  const elapsed = getSecondsSinceTimestamp(foundImageUploadTimestampSeconds, nowMs)
  return Math.max(0, MYSTERY_UPLOAD_DELAY_SECONDS - elapsed)
}

export const formatMysteryUploadCountdownMessage = (remainingSeconds: number): string =>
  `Please wait another ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before uploading your mystery image.`
