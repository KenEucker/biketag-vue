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

export const isScreeningEnabledForGame = (game?: Game): boolean =>
  game?.settings?.[SCREENING_ENABLED_SETTING] === 'true'

export const isScreeningConfigured = (game?: Game): boolean => {
  if (!isScreeningEnabledForGame(game)) return false
  if (getRoboflowApiKey()?.length) return true
  log('[screening] screening enabled but no Roboflow API key configured', { game: game?.name }, 'warn')
  return false
}
