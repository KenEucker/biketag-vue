import { loadEnv, type Plugin } from 'vite'

// This is the complete list of environment variables allowed in browser code.
// Neither VITE_* nor VUE_APP_* grants implicit permission to publish a value.
export const publicEnvironmentKeys = [
  'APP_ID',
  'DEBUG_FE',
  'DEBUG_A',
  'CACHE_RESET_INTERVAL',
  'CONTEXT',
  'ADMIN_EMAIL',
  'AMBASSADOR_ROLE',
  'PLAYER_ROLE',
  'A_CID',
  'A_DOMAIN',
  'B_KEY',
  'CLIENT_KEY',
  'GAME_NAME',
  'GAME_SOURCE',
  'IMAGE_SOURCE',
  'HOST',
  'G_AKEY',
  'GOOGLE_API_KEY',
  'I_CID',
  'IMGUR_CLIENT_ID',
  'RA_FE_KEY',
  'S3_FE_AID',
  'S3_FE_AKEY',
  'S3_FE_ACCESS_ID',
  'S3_FE_ACCESS_KEY',
  'S_CURL',
  'S_DSET',
  'SANITY_DATASET',
  'S_PID',
  'SANITY_PROJECT_ID',
  'RELOAD_SW',
  'IMGUR_DELAY_NOTICE',
  'IMGUR_DELAY',
] as const

export function frontendEnvironment(): Plugin {
  let privateValues: [string, string][] = []
  return {
    name: 'biketag-public-environment',
    config(config, { mode }) {
      const env = loadEnv(mode, config.envDir ?? config.root ?? process.cwd(), '')
      const publicKeys = new Set<string>(publicEnvironmentKeys)
      // A deployment may intentionally reuse a restricted FE key server-side.
      const publicValues = new Set(publicEnvironmentKeys.map((key) => env[key]).filter(Boolean))
      privateValues = Object.entries(env).filter(
        ([key, value]) =>
          !publicKeys.has(key) &&
          !publicValues.has(value) &&
          value.length >= 8 &&
          /SECRET|TOKEN|PASSWORD|PRIVATE|ACCESS[_]?KEY|(?:^|_)PASS$|_CSECRET$|_CS$|^A_M_CID$|^S3_|^RA_.*KEY$|^HOST_KEY$|^RF_KEY$/.test(
            key,
          ),
      )
      return {
        envPrefix: [],
        define: Object.fromEntries(
          publicEnvironmentKeys.map((key) => [
            `process.env.${key}`,
            JSON.stringify(env[key] ?? null),
          ]),
        ),
      }
    },
    // Check the emitted code AND source maps. Report names only, never values.
    generateBundle(_options, bundle) {
      for (const [filename, output] of Object.entries(bundle)) {
        const content =
          output.type === 'chunk'
            ? output.code + (output.map ? JSON.stringify(output.map) : '')
            : typeof output.source === 'string'
              ? output.source
              : Buffer.from(output.source).toString()
        for (const [key, value] of privateValues) {
          const escaped = JSON.stringify(value).slice(1, -1)
          if (content.includes(value) || content.includes(escaped)) {
            this.error(`Server-only environment variable ${key} was included in ${filename}`)
          }
        }
      }
    },
  }
}
