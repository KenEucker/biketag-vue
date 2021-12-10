import VueLogger from 'vuejs3-logger'

export const logging = {
  logger: VueLogger,
  options: {
    isEnabled: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    stringifyArguments: false,
    showLogLevel: true,
    showMethodName: true,
    separator: '|',
    showConsoleColors: true,
  },
}
