import { getStore } from '@netlify/blobs'
import { HttpStatusCode } from './constants'

export class RoundPublicationError extends Error {
  constructor(
    message: string,
    public status: HttpStatusCode,
  ) {
    super(message)
  }
}

export const roundConflict = () =>
  new RoundPublicationError(
    'The current round has changed. Refresh before submitting.',
    HttpStatusCode.Conflict,
  )

export const withRoundPublicationLock = async <T>(
  gameSlug: string,
  publish: () => Promise<T>,
): Promise<T> => {
  const store = getStore({
    name: 'round-publication-locks',
    consistency: 'strong',
    // The installed Blobs SDK treats non-412 conditional-write errors as success.
    fetch: async (input, init) => {
      const response = await fetch(input, init)
      if (!response.ok && response.status !== 412) {
        throw new Error(`Publication lock storage failed (${response.status})`)
      }
      return response
    },
  })
  const key = gameSlug.toLowerCase()
  const { modified } = await store.set(key, new Date().toISOString(), { onlyIfNew: true })
  if (!modified) throw roundConflict()

  // Do not expire an active lock: image publication can outlive a lease.
  // A terminated invocation's lock must be cleared after verifying it has stopped.
  try {
    return await publish()
  } finally {
    await store.delete(key)
  }
}
