import axios from 'axios'
import { log } from '../methods'
import {
  getRoboflowApiKey,
  getRoboflowRequestTimeoutMs,
  getRoboflowWorkflow,
  getRoboflowWorkflowEndpoint,
  getRoboflowWorkspace,
} from './config'
import type { ScreeningResult } from './types'

type RoboflowWorkflowEntry = {
  is_match?: unknown
  reason?: unknown
}

const hasScreeningFields = (value: unknown): value is RoboflowWorkflowEntry =>
  !!value &&
  typeof value === 'object' &&
  'is_match' in (value as Record<string, unknown>)

const extractScreeningEntry = (data: unknown): RoboflowWorkflowEntry | null => {
  if (Array.isArray(data)) {
    for (const item of data) {
      if (hasScreeningFields(item)) return item

      if (item && typeof item === 'object') {
        for (const value of Object.values(item as Record<string, unknown>)) {
          if (hasScreeningFields(value)) return value
        }
      }
    }
    return null
  }

  if (!data || typeof data !== 'object') return null

  const record = data as Record<string, unknown>
  if (hasScreeningFields(record)) return record

  if (Array.isArray(record.outputs)) {
    return extractScreeningEntry(record.outputs)
  }

  for (const value of Object.values(record)) {
    if (hasScreeningFields(value)) return value
    if (Array.isArray(value)) {
      const nested = extractScreeningEntry(value)
      if (nested) return nested
    }
  }

  return null
}

export const parseRoboflowScreeningResponse = (data: unknown): ScreeningResult | null => {
  const entry = extractScreeningEntry(data)
  if (!entry || typeof entry.is_match !== 'boolean') return null

  if (entry.is_match) {
    return { accepted: true }
  }

  if (typeof entry.reason !== 'string' || !entry.reason.length) return null

  return { accepted: false, reason: entry.reason }
}

const summarizeRoboflowResponse = (data: unknown): Record<string, unknown> => {
  if (Array.isArray(data)) {
    const first = data[0]
    return {
      shape: 'array',
      length: data.length,
      firstKeys:
        first && typeof first === 'object' && !Array.isArray(first)
          ? Object.keys(first as Record<string, unknown>)
          : undefined,
    }
  }

  if (data && typeof data === 'object') {
    return {
      shape: 'object',
      keys: Object.keys(data as Record<string, unknown>),
    }
  }

  return { shape: typeof data }
}

export const screenImageWithRoboflow = async (imageUrl: string): Promise<ScreeningResult | null> => {
  const apiKey = getRoboflowApiKey()
  if (!apiKey?.length) return null

  const workspace = getRoboflowWorkspace()
  const workflow = getRoboflowWorkflow()
  const endpoint = getRoboflowWorkflowEndpoint(workspace, workflow)
  const timeoutMs = getRoboflowRequestTimeoutMs()

  log('[screening] Calling Roboflow workflow', { workspace, workflow, imageUrl, timeoutMs, endpoint }, 'info')

  try {
    const response = await axios.post(
      endpoint,
      {
        api_key: apiKey,
        inputs: {
          image: {
            type: 'url',
            value: imageUrl,
          },
        },
      },
      {
        timeout: timeoutMs,
        validateStatus: () => true,
      },
    )

    if (response.status < 200 || response.status >= 300) {
      log(
        '[screening] Roboflow request failed',
        { status: response.status, imageUrl, summary: summarizeRoboflowResponse(response.data) },
        'warn',
      )
      return null
    }

    const parsed = parseRoboflowScreeningResponse(response.data)
    if (!parsed) {
      log(
        '[screening] Roboflow response could not be parsed',
        { imageUrl, summary: summarizeRoboflowResponse(response.data) },
        'warn',
      )
      return null
    }

    return parsed
  } catch (error: any) {
    log(
      '[screening] Roboflow request error',
      { message: error?.message ?? String(error), imageUrl },
      'warn',
    )
    return null
  }
}
