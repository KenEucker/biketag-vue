import type { Game } from 'biketag'
import { log } from '../methods'

export const ROBOFLOW_API_BASE_URL = 'https://serverless.roboflow.com'

export const ROBOFLOW_DEFAULT_WORKSPACE = 'bikes-workspace-6t0na'
export const ROBOFLOW_DEFAULT_WORKFLOW = 'bicycle-no-selfie-screening-api'

export const SCREENING_ENABLED_SETTING = 'screening::enabled'
export const MYSTERY_UPLOAD_DELAY_SECONDS = 60

export const getRoboflowApiKey = (): string | undefined =>
  process.env.RF_KEY ?? process.env.ROBOFLOW_API_KEY

export const getRoboflowWorkspace = (): string =>
  process.env.RF_WORKSPACE ?? ROBOFLOW_DEFAULT_WORKSPACE

export const getRoboflowWorkflow = (): string =>
  process.env.RF_WORKFLOW ?? ROBOFLOW_DEFAULT_WORKFLOW

export const getRoboflowWorkflowEndpoint = (workspace: string, workflow: string): string =>
  `${ROBOFLOW_API_BASE_URL}/${workspace}/workflows/${workflow}`

/** Background screening can run longer; default 2 minutes. */
export const ROBOFLOW_DEFAULT_REQUEST_TIMEOUT_MS = 120000

export const getRoboflowRequestTimeoutMs = (): number => {
  const parsed = parseInt(process.env.RF_TIMEOUT_MS ?? '', 10)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return ROBOFLOW_DEFAULT_REQUEST_TIMEOUT_MS
}

export const isScreeningEnabledForGame = (game?: Game): boolean =>
  game?.settings?.[SCREENING_ENABLED_SETTING] === 'true'

export const isScreeningConfigured = (game?: Game): boolean => {
  if (!isScreeningEnabledForGame(game)) return false
  if (getRoboflowApiKey()?.length) return true
  log('[screening] screening enabled but no Roboflow API key configured', { game: game?.name }, 'warn')
  return false
}
