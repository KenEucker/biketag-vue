export const SCREENING_ENABLED_SETTING = 'screening::enabled'
export const MYSTERY_UPLOAD_DELAY_SECONDS = 60

export const isScreeningEnabled = (settings?: Record<string, string>): boolean =>
  settings?.[SCREENING_ENABLED_SETTING] === 'true'

export const getSecondsSinceTimestamp = (timestampSeconds: number, nowMs = Date.now()): number => {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    return MYSTERY_UPLOAD_DELAY_SECONDS
  }
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

export const formatPlayerRejectionMessage = (
  imageType: 'found' | 'mystery',
  reason: string,
): string =>
  `Your ${imageType} BikeTag image was rejected: “${reason}” Automated image checking can make mistakes. Please upload another image.`

export const getUploadRateLimitKey = (
  gameName: string,
  tagnumber: number,
  imageType: 'found' | 'mystery',
): string => `${gameName}-${tagnumber}--${imageType}::posted`

export const clearUploadRateLimitKey = (
  gameName: string,
  tagnumber: number,
  imageType: 'found' | 'mystery',
): void => {
  localStorage.removeItem(getUploadRateLimitKey(gameName, tagnumber, imageType))
}
