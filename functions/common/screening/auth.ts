import type { getPayloadAuthorization } from '../methods'

export const playerMatchesAuthorization = (
  authorization: Awaited<ReturnType<typeof getPayloadAuthorization>>,
  playerId: string,
): boolean => {
  if (!authorization?.isValid || !playerId?.length) return false

  if (authorization.type === 'jwt') {
    return authorization.profile?.p_id === playerId
  }

  if (authorization.type === 'bearer' || authorization.type === 'client') {
    const profileId = authorization.profile?.sub ?? authorization.profile?.p_id
    return profileId === playerId
  }

  return false
}
