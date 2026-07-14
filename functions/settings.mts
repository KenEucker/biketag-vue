import { createClient } from '@sanity/client'
import type { Game, Setting } from 'biketag'
import { BikeTagClient } from 'biketag'
import {
  acceptCorsHeaders,
  getBikeTagClientOpts,
  getGameSiteUrl,
  getPayloadOpts,
  getProfileAuthorization,
  getSanityImageUrl,
  HttpStatusCode,
  log,
  requireGlobalAdmin,
  sendEmail,
} from './common'

const SETTING_FIELDS = ['_id', 'slug', 'name', 'description', 'key', 'value']
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@biketag.org'
const SETTING_CHANGE_EMAIL_TEMPLATE = 'game-setting-change-request'

const getAdminSanityClient = () =>
  createClient({
    projectId: process.env.SA_PID ?? process.env.S_PID ?? '',
    dataset: process.env.SA_DSET ?? process.env.S_DSET ?? '',
    token: process.env.SA_TOKEN ?? '',
    useCdn: false,
    apiVersion: '2024-01-01',
  })

const handleSettingChangeRequest = async (
  game: Game,
  gameSlug: string,
  profile: any,
  payload: Record<string, unknown>,
) => {
  const settingKey = typeof payload.settingKey === 'string' ? payload.settingKey.trim() : ''
  const settingName =
    typeof payload.settingName === 'string' ? payload.settingName.trim() : settingKey
  const settingDescription =
    typeof payload.settingDescription === 'string' ? payload.settingDescription.trim() : ''
  const currentValue =
    typeof payload.currentValue === 'string' ? payload.currentValue : String(payload.currentValue ?? '')
  const requestedValue =
    typeof payload.requestedValue === 'string' ? payload.requestedValue.trim() : ''
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : ''

  if (!settingKey.length) {
    return { status: HttpStatusCode.BadRequest, body: { error: 'settingKey is required' } }
  }
  if (!requestedValue.length) {
    return { status: HttpStatusCode.BadRequest, body: { error: 'requested value is required' } }
  }
  if (!reason.length) {
    return { status: HttpStatusCode.BadRequest, body: { error: 'reason is required' } }
  }

  const ambassadorName =
    profile?.user_metadata?.name || profile?.name || profile?.email || 'BikeTag Ambassador'
  const ambassadorEmail = profile?.email ?? ''
  const gameProper = game.name?.length
    ? `${game.name[0].toUpperCase()}${game.name.slice(1)}`
    : gameSlug
  const host = getGameSiteUrl(gameSlug)
  const subdomainIcon = game.logo?.length ? getSanityImageUrl(game.logo, 's') : '/images/BikeTag.svg'
  const subject = `[${gameSlug}] Setting change request: ${settingKey}`

  const emailSent = await sendEmail(
    SUPPORT_EMAIL,
    subject,
    {
      game: gameSlug,
      gameProper,
      host,
      subdomainIcon,
      settingName,
      settingKey,
      settingDescription,
      currentValue,
      requestedValue,
      reason,
      ambassadorName,
      ambassadorEmail,
    },
    SETTING_CHANGE_EMAIL_TEMPLATE,
    ambassadorEmail,
  )

  if (!emailSent) {
    log('[game-settings] Setting change request email failed', { game: gameSlug, settingKey }, 'error')
    return {
      status: HttpStatusCode.InternalServerError,
      body: { error: 'failed to send setting change request email' },
    }
  }

  log('[game-settings] Setting change request email sent', {
    game: gameSlug,
    settingKey,
    ambassadorEmail,
  })

  return {
    status: HttpStatusCode.Ok,
    body: { success: true },
  }
}

export default async (req: Request) => {
  const headers = acceptCorsHeaders()

  log('[game-settings] Incoming request', { method: req.method, url: req.url })

  if (req.method === 'OPTIONS') {
    return new Response(undefined, {
      status: HttpStatusCode.NoContent,
      headers,
    })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', {
      headers,
      status: HttpStatusCode.MethodNotAllowed,
    })
  }

  try {
    const profile = await getProfileAuthorization(req)

    if (!profile?.isBikeTagAmbassador) {
      log('[game-settings] Unauthorized attempt', { email: profile?.email ?? 'none' }, 'warn')
      return new Response("you don't have permission to do that", {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const biketagOpts = getBikeTagClientOpts(req, true)
    const biketag = new BikeTagClient(biketagOpts)

    const game = (await biketag.game(biketagOpts.game, {
      source: 'sanity',
      concise: true,
    })) as unknown as Game
    log('[game-settings] Retrieved game', { name: game?.name ?? 'none' })

    if (!game?.name) {
      return new Response(JSON.stringify({ error: 'game not found' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    if (req.method === 'GET') {
      const settingsResponse = await biketag.getSettings(
        {
          game: biketagOpts.game,
          fields: SETTING_FIELDS,
        },
        { source: 'sanity' },
      )
      log('[game-settings] getSettings response', {
        success: settingsResponse.success,
        status: settingsResponse.status,
        count: settingsResponse.success ? settingsResponse.data?.length : 0,
      })

      if (!settingsResponse.success) {
        return new Response(JSON.stringify(settingsResponse), {
          status: settingsResponse.status ?? HttpStatusCode.BadRequest,
          headers,
        })
      }

      return new Response(JSON.stringify(settingsResponse.data ?? []), {
        status: HttpStatusCode.Ok,
        headers,
      })
    }

    const updatePayload = await getPayloadOpts(req)

    if (
      updatePayload.requestChange === true ||
      (typeof updatePayload.settingKey === 'string' && updatePayload.settingKey.length)
    ) {
      const requestResult = await handleSettingChangeRequest(
        game,
        biketagOpts.game,
        profile,
        updatePayload,
      )
      return new Response(JSON.stringify(requestResult.body), {
        headers,
        status: requestResult.status,
      })
    }

    if (!requireGlobalAdmin(profile)) {
      log('[game-settings] Admin update denied', { email: profile?.email ?? 'none' }, 'warn')
      return new Response("you don't have permission to update settings", {
        headers,
        status: HttpStatusCode.Unauthorized,
      })
    }

    const updates = Array.isArray(updatePayload.settings)
      ? updatePayload.settings
      : updatePayload._id
        ? [updatePayload]
        : []

    const validUpdates = updates.filter(
      (setting: Partial<Setting>) => setting?._id?.length && setting?.key?.length,
    )

    if (!validUpdates.length) {
      return new Response(JSON.stringify({ error: 'no valid settings to update' }), {
        headers,
        status: HttpStatusCode.BadRequest,
      })
    }

    const sanity = getAdminSanityClient()
    const results: Array<{ _id: string; key: string; success: boolean; error?: string }> = []

    for (const setting of validUpdates) {
      try {
        await sanity.patch(setting._id!).set({ value: setting.value ?? '' }).commit()
        results.push({ _id: setting._id!, key: setting.key!, success: true })
      } catch (error: any) {
        log('[game-settings] Failed to update setting', { setting, error }, 'error')
        results.push({
          _id: setting._id!,
          key: setting.key!,
          success: false,
          error: error?.message ?? 'update failed',
        })
      }
    }

    const failures = results.filter((result) => !result.success)
    if (failures.length) {
      return new Response(
        JSON.stringify({
          success: false,
          results,
          error: 'one or more settings failed to update',
        }),
        {
          headers,
          status: HttpStatusCode.BadRequest,
        },
      )
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers,
      status: HttpStatusCode.Ok,
    })
  } catch (err: any) {
    log('[game-settings] Unexpected error', err, 'error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: HttpStatusCode.InternalServerError,
      headers,
    })
  }
}
