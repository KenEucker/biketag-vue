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

/** Create a classified upload failure without attaching request data. */
const uploadError = (message: string, code: string) => Object.assign(new Error(message), { code })

/** Return the queue key for a trusted PUT, stripping only the expected path-style AWS bucket. */
const getQueueUploadKey = (config: InternalAxiosRequestConfig, bucket: string) => {
  try {
    const url = new URL(config.url!)
    if (
      config.method?.toUpperCase() !== 'PUT' ||
      url.protocol !== 'https:' ||
      !/\.(digitaloceanspaces\.com|amazonaws\.com)$/.test(url.hostname)
    )
      return undefined
    let path = url.pathname.slice(1)
    if (/^s3(?:[.-][a-z0-9-]+)*\.amazonaws\.com$/.test(url.hostname)) {
      const prefix = `${encodeURIComponent(bucket)}/`
      if (!path.startsWith(prefix)) return undefined
      path = path.slice(prefix.length)
    }
    return path.startsWith('queue/') ? decodeURIComponent(path) : undefined
  } catch {
    return undefined
  }
}

/** Bound the entire renewal operation and discard its result after cancellation or timeout. */
async function renewUploadUrl(
  refreshUrl: () => Promise<string>,
  signal: InternalAxiosRequestConfig['signal'],
  timeoutMs: number,
) {
  /** Preserve the upload flow's cancellation message and code during renewal. */
  const canceled = () => uploadError('Image upload canceled.', 'ERR_CANCELED')
  if (signal?.aborted) throw canceled()
  /** Reject the renewal wait when its deadline or caller cancellation occurs. */
  let rejectDeadline: (error: Error) => void = () => {}
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject
  })
  const timer = setTimeout(
    () =>
      rejectDeadline(
        uploadError(
          'Image upload URL renewal took too long. Please try again.',
          'UPLOAD_SIGNING_TIMEOUT',
        ),
      ),
    timeoutMs,
  )
  /** Stop waiting for renewal when the caller cancels. */
  const onAbort = () => rejectDeadline(canceled())
  signal?.addEventListener?.('abort', onAbort)
  try {
    return await Promise.race([
      deadline,
      Promise.resolve().then(() => {
        if (signal?.aborted) throw canceled()
        return refreshUrl()
      }),
    ])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener?.('abort', onAbort)
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
  /** Record an optional transport event without affecting request behavior. */
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
    /** Reject the active transfer wait on timeout or cancellation. */
    let rejectDeadline: (error: Error) => void = () => {}
    const deadline = new Promise<never>((_resolve, reject) => {
      rejectDeadline = reject
    })
    /** Summarize timing and byte counts without retaining request data. */
    const snapshot = () => ({
      transferAttempt,
      durationMs: Date.now() - started,
      loaded,
      total,
      lastProgressAgoMs: Date.now() - lastProgressAt,
    })
    /** Cancel the transfer while preserving its first timeout or cancellation error. */
    const abort = (error: Error) => {
      deadlineError ??= error
      controller.abort()
      rejectDeadline(deadlineError)
    }
    /** Classify missing progress as a recoverable upload stall. */
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
    /** Enforce elapsed deadlines when suspended browser execution resumes. */
    const checkDeadline = () => {
      if (Date.now() - started >= policy.timeoutMs) {
        abort(uploadError('Image upload took too long. Please try again.', 'UPLOAD_TIMEOUT'))
      } else if (Date.now() - lastProgressAt >= policy.idleMs) {
        stalled()
      }
    }
    const document = globalThis.document
    document?.addEventListener('visibilitychange', checkDeadline)
    /** Cancel the transfer without treating caller cancellation as retryable. */
    const canceled = () => abort(uploadError('Image upload canceled.', 'ERR_CANCELED'))
    config.signal?.addEventListener?.('abort', canceled)
    report({ event: 'started', host: destination.hostname, ...snapshot() })
    let failure: any
    try {
      if (config.signal?.aborted) {
        canceled()
        return await deadline
      }
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
    const refreshed = new URL(
      await renewUploadUrl(refreshUrl, config.signal, policy.signingTimeoutMs),
    )
    if (refreshed.origin !== destination.origin || refreshed.pathname !== destination.pathname) {
      throw uploadError('Upload retry destination changed. Please try again.', 'UPLOAD_DESTINATION')
    }
    url = refreshed.href
  }
  throw uploadError('Image upload did not complete. Please try again.', 'UPLOAD_FAILED')
}

/** Isolate adapters and listeners from the store's shared client and other requests. */
class QueuedUploadClient extends BikeTagClient {
  /** Scope signing diagnostics and recoverable queue PUTs to one submission. */
  constructor(
    configuration: ConstructorParameters<typeof BikeTagClient>[0],
    payload: any,
    record?: SubmissionStageRecorder,
  ) {
    super(configuration)
    this.fetcher.defaults.timeout = UPLOAD_POLICY.signingTimeoutMs
    /** Record signing outcomes without exposing signed URLs or propagating logger failures. */
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
      const bucket = `${payload.game}-biketag`
      const key = getQueueUploadKey(config, bucket)
      if (!key) return adapter(config)
      return uploadWithRecovery(
        adapter,
        config,
        async () => {
          const signed = await this.fetchSignedUrl(
            {
              game: payload.game,
              bucket,
              key,
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

/** Queue image uploads with isolated recovery; preserve the shared client for other operations. */
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
