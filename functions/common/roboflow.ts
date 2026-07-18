const DEFAULT_ROBOFLOW_ENDPOINT =
  'https://serverless.roboflow.com/infer/workflows/bikes-workspace-6t0na/bicycle-no-selfie-screening-api'
const DEFAULT_ROBOFLOW_IMAGE_INPUT = 'image'
const DEFAULT_ROBOFLOW_TIMEOUT_MS = 20000

const REJECTION_CRITERIA = 'it does not have a bicycle in it or it contains a selfie'

export type RoboflowScreeningResult = {
  enabled: boolean
  passed: boolean
  failOpen?: boolean
  reason?: string
  message?: string
  roboflowStatus?: number
}

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return value
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(', ')
  }
  return undefined
}

const readDecisionString = (value: string): boolean | undefined => {
  const normalized = value.trim().toLowerCase()
  if (['pass', 'passed', 'valid', 'approved', 'accepted', 'success', 'true'].includes(normalized)) {
    return true
  }
  if (['fail', 'failed', 'invalid', 'rejected', 'reject', 'false'].includes(normalized)) {
    return false
  }
  return undefined
}

const parseRoboflowDecision = (responseBody: unknown): { passed?: boolean; reason?: string } => {
  let explicitDecision: boolean | undefined
  let hasBicycle: boolean | undefined
  let hasSelfie: boolean | undefined
  const reasons: string[] = []

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    if (!isRecord(value)) return

    Object.entries(value).forEach(([key, entry]) => {
      const normalizedKey = normalizeKey(key)
      const reason = getStringValue(entry)

      if (
        reason &&
        ['reason', 'reasons', 'rejectionreason', 'message', 'explanation', 'details'].includes(
          normalizedKey,
        )
      ) {
        reasons.push(reason)
      }

      if (typeof entry === 'boolean') {
        if (
          [
            'pass',
            'passed',
            'valid',
            'approved',
            'accepted',
            'meetscriteria',
            'isbiketag',
            'isvalid',
            'passfail',
          ].includes(normalizedKey)
        ) {
          explicitDecision = entry
        }

        if (['fail', 'failed', 'rejected', 'reject', 'invalid'].includes(normalizedKey)) {
          explicitDecision = !entry
        }

        if (
          ['hasbicycle', 'containsbicycle', 'bicyclepresent', 'hasbike', 'containsbike'].includes(
            normalizedKey,
          )
        ) {
          hasBicycle = entry
        }

        if (['hasselfie', 'containsselfie', 'isselfie', 'selfie'].includes(normalizedKey)) {
          hasSelfie = entry
        }
      }

      if (
        typeof entry === 'string' &&
        [
          'status',
          'result',
          'decision',
          'outcome',
          'verdict',
          'validation',
          'passfail',
          'isvalid',
        ].includes(normalizedKey)
      ) {
        const stringDecision = readDecisionString(entry)
        if (stringDecision !== undefined) {
          explicitDecision = stringDecision
        }
      }

      visit(entry)
    })
  }

  visit(responseBody)

  if (hasSelfie === true) {
    return { passed: false, reason: reasons[0] ?? 'Roboflow detected a selfie.' }
  }

  if (hasBicycle === false) {
    return { passed: false, reason: reasons[0] ?? 'Roboflow did not detect a bicycle.' }
  }

  if (explicitDecision !== undefined) {
    return { passed: explicitDecision, reason: reasons[0] }
  }

  if (hasBicycle === true && hasSelfie === false) {
    return { passed: true, reason: reasons[0] }
  }

  return { reason: reasons[0] }
}

export const getBikeTagRejectionMessage = (reason?: string): string => {
  const roboflowReason = reason?.length ? ` Roboflow reason: ${reason}` : ''
  return `This image was rejected because it does not meet the criteria for a BikeTag: ${REJECTION_CRITERIA}.${roboflowReason}`
}

export const screenBikeTagImageWithRoboflow = async (
  imageUrl: string,
): Promise<RoboflowScreeningResult> => {
  const apiKey = process.env.ROBOFLOW_API_KEY

  if (!apiKey?.length) {
    return { enabled: false, passed: true }
  }

  const endpoint = process.env.ROBOFLOW_ENDPOINT ?? DEFAULT_ROBOFLOW_ENDPOINT
  const imageInputName = process.env.ROBOFLOW_IMAGE_INPUT ?? DEFAULT_ROBOFLOW_IMAGE_INPUT
  const timeout = parseInt(process.env.ROBOFLOW_TIMEOUT_MS ?? '', 10)
  const timeoutMs = Number.isNaN(timeout) ? DEFAULT_ROBOFLOW_TIMEOUT_MS : timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        inputs: {
          [imageInputName]: {
            type: 'url',
            value: imageUrl,
          },
        },
      }),
      signal: controller.signal,
    })

    const responseText = await response.text()
    let responseBody: unknown = responseText

    try {
      responseBody = responseText.length ? JSON.parse(responseText) : {}
    } catch {
      responseBody = responseText
    }

    if (!response.ok) {
      return {
        enabled: true,
        passed: true,
        failOpen: true,
        reason: `Roboflow returned ${response.status}`,
        roboflowStatus: response.status,
      }
    }

    const decision = parseRoboflowDecision(responseBody)

    if (decision.passed === false) {
      return {
        enabled: true,
        passed: false,
        reason: decision.reason,
        message: getBikeTagRejectionMessage(decision.reason),
        roboflowStatus: response.status,
      }
    }

    if (decision.passed === true) {
      return {
        enabled: true,
        passed: true,
        reason: decision.reason,
        roboflowStatus: response.status,
      }
    }

    return {
      enabled: true,
      passed: true,
      failOpen: true,
      reason: 'Roboflow response did not include a screening decision',
      roboflowStatus: response.status,
    }
  } catch (err: any) {
    return {
      enabled: true,
      passed: true,
      failOpen: true,
      reason: err?.name === 'AbortError' ? 'Roboflow request timed out' : 'Roboflow request failed',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
