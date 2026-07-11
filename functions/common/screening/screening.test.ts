import { describe, expect, it, vi } from 'vitest'
import {
  acceptedResponse,
  noBicycleRejectionResponse,
  selfieRejectionResponse,
} from './__fixtures__/roboflow-responses'
import { isScreeningConfigured, isScreeningEnabledForGame } from './config'
import { parseRoboflowScreeningResponse, screenImageWithRoboflow } from './roboflow'
import {
  formatMysteryUploadCountdownMessage,
  getMysteryUploadRemainingSeconds,
} from './timing'
import { replaceQueueImageRoleInBase } from './rejected-storage'

describe('roboflow screening', () => {
  it('parses accepted response', () => {
    expect(parseRoboflowScreeningResponse(acceptedResponse)).toEqual({ accepted: true })
  })

  it('parses selfie rejection', () => {
    expect(parseRoboflowScreeningResponse(selfieRejectionResponse)).toEqual({
      accepted: false,
      reason: selfieRejectionResponse[0].reason,
    })
  })

  it('parses no-bicycle rejection', () => {
    expect(parseRoboflowScreeningResponse(noBicycleRejectionResponse)).toEqual({
      accepted: false,
      reason: noBicycleRejectionResponse[0].reason,
    })
  })

  it('returns null for empty list', () => {
    expect(parseRoboflowScreeningResponse([])).toBeNull()
  })

  it('returns null when is_match is missing', () => {
    expect(parseRoboflowScreeningResponse([{ reason: 'x' }])).toBeNull()
  })

  it('returns null when reason is missing', () => {
    expect(parseRoboflowScreeningResponse([{ is_match: false }])).toBeNull()
  })

  it('returns null for malformed response', () => {
    expect(parseRoboflowScreeningResponse({ ok: true })).toBeNull()
  })

  it('fail-opens on operational HTTP failure', async () => {
    vi.resetModules()
    process.env.RF_KEY = 'test-key'
    const axios = await import('axios')
    vi.spyOn(axios.default, 'post').mockResolvedValue({ status: 500, data: [] } as any)
    const { screenImageWithRoboflow: screenWithMock } = await import('./roboflow')
    await expect(screenWithMock('https://example.com/image.webp')).resolves.toBeNull()
  })
})

describe('screening feature flag', () => {
  it('bypasses screening when setting is absent', () => {
    expect(isScreeningEnabledForGame({ settings: {} } as any)).toBe(false)
  })

  it('bypasses screening when setting is false', () => {
    expect(isScreeningEnabledForGame({ settings: { 'screening::enabled': 'false' } } as any)).toBe(
      false,
    )
  })

  it('enables screening only for exact true', () => {
    expect(isScreeningEnabledForGame({ settings: { 'screening::enabled': 'true' } } as any)).toBe(
      true,
    )
  })

  it('treats missing API key as unavailable', () => {
    delete process.env.RF_KEY
    delete process.env.ROBOFLOW_API_KEY
    expect(
      isScreeningConfigured({ settings: { 'screening::enabled': 'true' }, name: 'Portland' } as any),
    ).toBe(false)
  })
})

describe('mystery upload timing', () => {
  const now = 1_700_000_000_000
  const foundTime = Math.floor((now - 15_000) / 1000)

  it('returns 60 seconds when no found timestamp is available', () => {
    expect(getMysteryUploadRemainingSeconds(undefined, now)).toBe(60)
  })

  it('calculates remaining seconds from found upload timestamp', () => {
    expect(getMysteryUploadRemainingSeconds(foundTime, now)).toBe(45)
  })

  it('returns zero after 60 seconds', () => {
    const oldFoundTime = Math.floor((now - 61_000) / 1000)
    expect(getMysteryUploadRemainingSeconds(oldFoundTime, now)).toBe(0)
  })

  it('formats dynamic countdown message', () => {
    expect(formatMysteryUploadCountdownMessage(45)).toBe(
      'Please wait another 45 seconds before uploading your mystery image.',
    )
  })
})

describe('rejected filename transforms', () => {
  it('renames found image base to rejected', () => {
    expect(replaceQueueImageRoleInBase('portland-tag-123--found--abc123', 'rejected')).toBe(
      'portland-tag-123--rejected--abc123',
    )
  })

  it('renames mystery image base to rejected', () => {
    expect(replaceQueueImageRoleInBase('portland-tag-124--mystery--abc123', 'rejected')).toBe(
      'portland-tag-124--rejected--abc123',
    )
  })

  it('restores rejected image base to found', () => {
    expect(replaceQueueImageRoleInBase('portland-tag-123--rejected--abc123', 'found')).toBe(
      'portland-tag-123--found--abc123',
    )
  })
})
