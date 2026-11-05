import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import BikeTagClient from 'biketag'
import { summarizeSubmissionError, type SubmissionStageRecorder } from './submission-diagnostics'

export const UPLOAD_POLICY = {
  idleMs: 45_000,
  timeoutMs: 180_000,
  signingTimeoutMs: 30_000,
  progressIntervalMs: 10_000,
  maxAttempts: 2,
}

const uploadError = (message: string, code: string) => Object.assign(new Error(message), { code })

// Only these requests are safe to replay: a PUT replaces the same queue object with the same bytes.
const isQueueUpload = (config: InternalAxiosRequestConfig) => {
  try {
    const url = new URL(config.url!)
    return (
      config.method?.toUpperCase() === 'PUT' &&
      url.protocol === 'https:' &&
      /\.(digitaloceanspaces\.com|amazonaws\.com)$/.test(url.hostname) &&
      url.pathname.startsWith('/queue/')
    )
  } catch {
    return false
  }
}

/** No telemetry is sent here. The recorder buffers a small, explicit trail for a failure report. */
export async function uploadWithRecovery(
  adapter: AxiosAdapter,
  config: InternalAxiosRequestConfig,
  refreshUrl: () => Promise<string>,
  record?: SubmissionStageRecorder,
  policy = UPLOAD_POLICY,
) {
  const destination = new URL(config.url!)
  const stage = 'image:upload'
  const report = (details: Record<string, unknown>) => {
    try {
      record?.(stage, details)
    } catch {
      // Diagnostics must not prevent uploading.
    }
  }
  let url = config.url!
  for (let transferAttempt = 1; transferAttempt <= policy.maxAttempts; transferAttempt++) {
    const controller = new AbortController()
    const started = Date.now()
    let lastProgressAt = started
    let lastRecordedAt = -Infinity
    let loaded = 0
    let reportedComplete = false
    let finished = false
    let total: number | undefined = config.data?.byteLength ?? config.data?.size
    let deadlineError: Error | undefined
    let rejectDeadline: (error: Error) => void = () => {}
    const deadline = new Promise<never>((_resolve, reject) => {
      rejectDeadline = reject
    })
    const snapshot = () => ({
      transferAttempt,
      durationMs: Date.now() - started,
      loaded,
      total,
      lastProgressAgoMs: Date.now() - lastProgressAt,
    })
    const abort = (error: Error) => {
      deadlineError ??= error
      controller.abort()
      rejectDeadline(deadlineError)
    }
    const stalled = () =>
      abort(
        uploadError('Image upload stopped making progress. Please try again.', 'UPLOAD_STALLED'),
      )
    let idleTimer = setTimeout(stalled, policy.idleMs)
    const timeoutTimer = setTimeout(
      () => abort(uploadError('Image upload took too long. Please try again.', 'UPLOAD_TIMEOUT')),
      policy.timeoutMs,
    )
    // Timers can be suspended on phones. Check elapsed time when the page becomes visible again.
    const checkDeadline = () => {
      if (Date.now() - started >= policy.timeoutMs) {
        abort(uploadError('Image upload took too long. Please try again.', 'UPLOAD_TIMEOUT'))
      } else if (Date.now() - lastProgressAt >= policy.idleMs) {
        stalled()
      }
    }
    const document = globalThis.document
    document?.addEventListener('visibilitychange', checkDeadline)
    const canceled = () => abort(uploadError('Image upload canceled.', 'ERR_CANCELED'))
    config.signal?.addEventListener?.('abort', canceled)
    report({ event: 'started', host: destination.hostname, ...snapshot() })
    let failure: any
    try {
      if (config.signal?.aborted) canceled()
      const response = await Promise.race([
        deadline,
        adapter({
          ...config,
          url,
          signal: controller.signal,
          timeout: policy.timeoutMs,
          onUploadProgress: (progress) => {
            if (finished || controller.signal.aborted) return
            if (progress.loaded > loaded) {
              loaded = progress.loaded
              lastProgressAt = Date.now()
              clearTimeout(idleTimer)
              idleTimer = setTimeout(stalled, policy.idleMs)
            }
            total = progress.total ?? total
            const complete = total !== undefined && total > 0 && loaded >= total
            if (
              Date.now() - lastRecordedAt >= policy.progressIntervalMs ||
              (complete && !reportedComplete)
            ) {
              report({ event: 'progress', ...snapshot() })
              lastRecordedAt = Date.now()
              reportedComplete = complete
            }
            config.onUploadProgress?.(progress)
          },
        }),
      ])
      report({ event: 'completed', status: response.status, ...snapshot() })
      return response
    } catch (error) {
      failure = deadlineError ?? error
      // Never include config, headers, response bodies, image bytes or signed URL query strings.
      report({ event: 'failed', error: summarizeSubmissionError(failure), ...snapshot() })
    } finally {
      finished = true
      clearTimeout(idleTimer)
      clearTimeout(timeoutTimer)
      document?.removeEventListener('visibilitychange', checkDeadline)
      config.signal?.removeEventListener?.('abort', canceled)
    }

    const transient = [
      'UPLOAD_STALLED',
      'UPLOAD_TIMEOUT',
      'ERR_NETWORK',
      'ECONNABORTED',
      'ETIMEDOUT',
    ]
    if (
      transferAttempt === policy.maxAttempts ||
      !transient.includes(failure?.code) ||
      config.signal?.aborted
    ) {
      throw failure
    }
    report({ event: 'retrying', transferAttempt: transferAttempt + 1 })
    // Abort/settle the old request before obtaining a fresh signature. Reuse the existing body.
    const refreshed = new URL(await refreshUrl())
    if (refreshed.origin !== destination.origin || refreshed.pathname !== destination.pathname) {
      throw uploadError('Upload retry destination changed. Please try again.', 'UPLOAD_DESTINATION')
    }
    url = refreshed.href
  }
  throw uploadError('Image upload did not complete. Please try again.', 'UPLOAD_FAILED')
}

/** Isolate adapters and listeners from the store's shared client and other requests. */
class QueuedUploadClient extends BikeTagClient {
  constructor(
    configuration: ConstructorParameters<typeof BikeTagClient>[0],
    payload: any,
    record?: SubmissionStageRecorder,
  ) {
    super(configuration)
    this.fetcher.defaults.timeout = UPLOAD_POLICY.signingTimeoutMs
    const reportSigning: SubmissionStageRecorder = (stage, details) => {
      try {
        record?.(stage, details)
      } catch {
        // Diagnostics are optional.
      }
    }
    // The SDK signs through request(), rather than its public fetchSignedUrl() method.
    this.fetcher.interceptors.request.use((config) => {
      reportSigning('image:sign-url', { event: 'started' })
      return config
    })
    this.fetcher.interceptors.response.use(
      (response) => {
        reportSigning('image:sign-url', { event: 'completed', status: response.status })
        return response
      },
      (error) => {
        reportSigning('image:sign-url', { event: 'failed', error: summarizeSubmissionError(error) })
        return Promise.reject(error)
      },
    )
    const adapter = axios.getAdapter(this.plainFetcher.defaults.adapter)
    this.plainFetcher.defaults.adapter = (config) => {
      if (!isQueueUpload(config)) return adapter(config)
      return uploadWithRecovery(
        adapter,
        config,
        async () => {
          const signed = await this.fetchSignedUrl(
            {
              game: payload.game,
              bucket: `${payload.game}-biketag`,
              key: decodeURIComponent(new URL(config.url!).pathname.slice(1)),
              p_id: payload.playerId,
              contentType: payload.contentType,
            },
            { source: 'biketag' },
          )
          if (!signed.success || !signed.data) throw new Error('Could not renew image upload URL')
          return signed.data
        },
        record,
      )
    }
  }
}

export function queueTagWithUploadRecovery(
  client: BikeTagClient,
  payload: any,
  source: string,
  record?: SubmissionStageRecorder,
) {
  if (source !== 'aws' || (!payload.foundImage && !payload.mysteryImage)) {
    return client.queueTag(payload, { source })
  }
  // The SDK mutates image fields even on failure. Keep the caller's file available for manual retry.
  const uploadPayload = { ...payload }
  const uploadClient = new QueuedUploadClient(client.config(), uploadPayload, record)
  return uploadClient.queueTag(uploadPayload, { source })
}
