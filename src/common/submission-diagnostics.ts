// Keep diagnostics explicit: never serialize a tag, profile, HTTP config, or image bytes.
export type SubmissionStageRecorder = (stage: string, details: Record<string, unknown>) => void

const safeText = (value: unknown): string =>
  String(value ?? '')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/g, '$1?[redacted]')
    .replace(/\b(Bearer|JWT)\s+\S+/gi, '$1 [redacted]')
    .slice(0, 2000)

export const summarizeSubmissionError = (error: any): Record<string, unknown> => ({
  name: safeText(error?.name),
  message: safeText(error?.message ?? error?.error ?? error),
  code: safeText(error?.code),
  status: error?.response?.status ?? error?.status,
  ...(error?.stack ? { stack: safeText(error.stack) } : {}),
})

export async function observeSubmissionStage<T>(
  stage: string,
  operation: () => Promise<T>,
  record?: SubmissionStageRecorder,
): Promise<T> {
  const started = Date.now()
  // Observability must never change the result of an upload.
  const report = (details: Record<string, unknown>) => {
    try {
      record?.(stage, details)
    } catch {
      // A diagnostic callback is optional.
    }
  }
  report({ event: 'started' })
  try {
    const result: any = await operation()
    report({
      event: 'completed',
      durationMs: Date.now() - started,
      success: result?.success,
      status: result?.status,
      source: result?.source,
      ...(result?.error ? { error: summarizeSubmissionError(result.error) } : {}),
    })
    return result
  } catch (error) {
    report({
      event: 'threw',
      durationMs: Date.now() - started,
      error: summarizeSubmissionError(error),
    })
    throw error
  }
}

export const getSubmissionContext = ({
  game,
  action,
  tag = {},
  queuedTag = {},
  currentTag = {},
  playerId,
  playerName,
  formStep,
  imageSource,
}: any): Record<string, string> => {
  const id = playerId || tag.playerId || queuedTag.playerId || ''
  const name = tag.foundPlayer || tag.mysteryPlayer || queuedTag.foundPlayer || playerName || ''
  const number = [tag.tagnumber, queuedTag.tagnumber, currentTag.tagnumber].find(
    (value) => Number.isFinite(value) && value > 0,
  )
  const imageInfo = (image: any) =>
    image
      ? {
          name: safeText(image.name),
          size: image.size,
          type: image.type,
          lastModified: image.lastModified,
        }
      : null
  return {
    game: game || 'unknown-game',
    playerId: id,
    playerName: name,
    tagnumber: number ? String(number) : 'unknown-round',
    submission: `${game || 'unknown-game'}-${number || 'unknown-round'}--${name || id || 'unknown-player'}`,
    action,
    formStep: String(formStep ?? ''),
    imageSource: String(imageSource ?? ''),
    context: JSON.stringify({
      submittedRound: tag.tagnumber,
      queuedRound: queuedTag.tagnumber,
      currentRound: currentTag.tagnumber,
      foundPlayer: safeText(tag.foundPlayer || queuedTag.foundPlayer),
      mysteryPlayer: safeText(tag.mysteryPlayer || queuedTag.mysteryPlayer),
      currentMysteryPlayer: safeText(currentTag.mysteryPlayer),
      currentMysteryPlayerId: safeText(currentTag.playerId),
      submittedPlayerId: safeText(tag.playerId),
      queuedPlayerId: safeText(queuedTag.playerId),
      profilePlayerId: safeText(playerId),
      foundImage: imageInfo(tag.foundImage),
      mysteryImage: imageInfo(tag.mysteryImage),
      hasFoundImageUrl: !!(tag.foundImageUrl || queuedTag.foundImageUrl),
      hasMysteryImageUrl: !!(tag.mysteryImageUrl || queuedTag.mysteryImageUrl),
    }),
  }
}

type AttemptState = {
  correlationId: string
  attemptNumber: number
  updatedAt: number
  lastError?: { attemptId: string; message: string; stage: string; at: string }
}
type DiagnosticStorage = Pick<Storage, 'getItem' | 'setItem'>
type SendReport = (fields: Record<string, string>) => Promise<unknown>
const memoryStorage = new Map<string, string>()

/** A failure and its subsequent retries share a reference, including after a same-tab reload. */
export function createSubmissionAttempt(
  fields: Record<string, string>,
  send: SendReport,
  storage?: DiagnosticStorage,
) {
  const key = `biketag:submission-diagnostics:${JSON.stringify([
    fields.game,
    fields.action,
    fields.tagnumber,
    fields.playerId,
    fields.playerName,
  ])}`
  const makeId = () =>
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  let state: AttemptState | undefined
  try {
    const saved = JSON.parse(storage?.getItem(key) || memoryStorage.get(key) || 'null')
    if (
      saved?.correlationId &&
      Number.isInteger(saved.attemptNumber) &&
      saved.attemptNumber > 0 &&
      Date.now() - saved.updatedAt < 24 * 60 * 60 * 1000
    )
      state = saved
  } catch {
    // Private browsing and storage limits must not prevent playing.
    const saved = JSON.parse(memoryStorage.get(key) || 'null')
    if (saved && Date.now() - saved.updatedAt < 24 * 60 * 60 * 1000) state = saved
  }
  state ??= { correlationId: makeId(), attemptNumber: 0, updatedAt: Date.now() }
  const previousError = state.lastError
  state.attemptNumber += 1
  const attemptId = makeId()
  const started = Date.now()
  const events: Record<string, unknown>[] = []
  const save = () => {
    state.updatedAt = Date.now()
    memoryStorage.set(key, JSON.stringify(state))
    if (memoryStorage.size > 50) memoryStorage.delete(memoryStorage.keys().next().value!)
    try {
      storage?.setItem(key, JSON.stringify(state))
    } catch {
      /* optional storage */
    }
  }
  const record: SubmissionStageRecorder = (stage, details) => {
    events.push({ stage, at: new Date().toISOString(), ...details })
    if (events.length > 40) events.shift()
  }
  const report = async (event: string, message: unknown, stage: string) => {
    const connection = (globalThis.navigator as any)?.connection
    const reportFields = {
      ...fields,
      event,
      message: safeText(message),
      stage,
      correlationId: state.correlationId,
      attemptId,
      attemptNumber: String(state.attemptNumber),
      previousAttemptId: previousError?.attemptId || '',
      diagnostics: JSON.stringify({
        version: 1,
        at: new Date().toISOString(),
        durationMs: Date.now() - started,
        previousError,
        online: globalThis.navigator?.onLine,
        visibility: globalThis.document?.visibilityState,
        path: globalThis.location?.pathname,
        userAgent: globalThis.navigator?.userAgent,
        connection: connection
          ? {
              effectiveType: connection.effectiveType,
              rtt: connection.rtt,
              downlink: connection.downlink,
            }
          : undefined,
        events,
      }),
    }
    try {
      await send(reportFields)
    } catch (error) {
      console.warn('Could not deliver submission diagnostics', {
        correlationId: state.correlationId,
        event,
        error: summarizeSubmissionError(error),
      })
    }
  }
  save()
  return {
    fields,
    record,
    retrying: !!previousError,
    started: () =>
      previousError
        ? report('retry-started', 'Player submitted again after an error', 'preflight')
        : Promise.resolve(),
    failed: (error: unknown, stage: string) => {
      const summary = summarizeSubmissionError(error)
      record(stage, { event: 'failed', error: summary })
      state.lastError = {
        attemptId,
        message: String(summary.message),
        stage,
        at: new Date().toISOString(),
      }
      save()
      return report('error', summary.message, stage)
    },
    succeeded: () => {
      delete state.lastError
      save()
      return previousError
        ? report('retry-succeeded', 'Retry completed successfully', 'complete')
        : Promise.resolve()
    },
    blocked: (reason: string) =>
      previousError ? report('retry-blocked', reason, 'preflight') : Promise.resolve(),
    dismissed: () =>
      report('error-dismissed', 'Player clicked to dismiss the error notice', 'error-notice'),
  }
}
