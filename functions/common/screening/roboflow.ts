import axios from 'axios'
import { log } from '../methods'
import {
  getRoboflowApiKey,
  getRoboflowRequestTimeoutMs,
  getRoboflowWorkflow,
  getRoboflowWorkspace,
  ROBOFLOW_API_BASE_URL,
} from './config'
import type { ScreeningResult } from './types'

type RoboflowWorkflowEntry = {
  is_match?: unknown
  reason?: unknown
}

export const parseRoboflowScreeningResponse = (data: unknown): ScreeningResult | null => {
  if (!Array.isArray(data) || !data.length) return null

  const entry = data[0] as RoboflowWorkflowEntry
  if (typeof entry.is_match !== 'boolean' || typeof entry.reason !== 'string') return null

  if (entry.is_match) {
    return { accepted: true }
  }

  return { accepted: false, reason: entry.reason }
}

export const screenImageWithRoboflow = async (imageUrl: string): Promise<ScreeningResult | null> => {
  const apiKey = getRoboflowApiKey()
  if (!apiKey?.length) return null

  const workspace = getRoboflowWorkspace()
  const workflow = getRoboflowWorkflow()
  const endpoint = `${ROBOFLOW_API_BASE_URL}/${workspace}/workflows/${workflow}`

  const timeoutMs = getRoboflowRequestTimeoutMs()
  log('[screening] Calling Roboflow workflow', { workspace, workflow, imageUrl, timeoutMs }, 'info')

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
        { status: response.status, imageUrl },
        'warn',
      )
      return null
    }

    return parseRoboflowScreeningResponse(response.data)
  } catch (error: any) {
    log(
      '[screening] Roboflow request error',
      { message: error?.message ?? String(error), imageUrl },
      'warn',
    )
    return null
  }
}
