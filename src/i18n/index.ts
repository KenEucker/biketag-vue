import { createI18n } from 'vue-i18n'
import enUS from './locales/en-US.json'
import esES from './locales/es-ES.json'
export type MessageSchema = typeof enUS

const i18n = createI18n<[MessageSchema], 'en-US'>({
  locale: 'en-US',
  allowComposition: true,
  messages: {
    'en-US': enUS,
    'es-ES': esES,
  },
})

export default i18n
