import { createApp } from 'vue'
import * as Croquet from '@croquet/croquet'

//move to types
enum Notifications {
  foundTag,
}
interface Payload {
  name: string
  msg: string
  type: Notifications
}

let instace: any

export const getInstance = () => instace

export const croquetSession = (app: any) => {
  if (instace) return instace

  class BikeTagNotificationsModel extends Croquet.Model {
    init() {
      for (const value of Object.values(Notification)) {
        this.subscribe('notification', value, this.sendNotification)
      }
    }

    sendNotification(payload: Payload) {
      if (app.$store.getters.getProfile.user_metadata.name !== payload.name) {
        app.$toast.success(payload.msg, {
          position: top,
        })
      }
    }
  }
  class BikeTagNotificationsView extends Croquet.View {
    constructor(model: BikeTagNotificationsModel) {
      super(model)
      // this.model = model;
    }

    pubEvent(payload: Payload) {
      this.publish('notification', payload.type.toString(), payload)
    }
  }

  instace = createApp({
    data() {
      return {
        session: null,
      }
    },
    async created() {
      BikeTagNotificationsModel.register('BikeTagNotificationsModel')
      this.session = await Croquet.Session.join({
        apiKey: process.env.NOTIFICATION_KEY ?? '',
        appId: process.env.HOST ?? '',
        name: process.env.CROKET_SESSION_NAME ?? 'biketag',
        password: process.env.CROKET_SESSION_PASSWORD ?? 'secret',
        model: BikeTagNotificationsModel,
        view: BikeTagNotificationsView,
      })
    },
    methods: {
      sendNotification(payload: any) {
        this.session?.view.sendNotification(payload)
      },
    },
  }).mount(document.createElement('div'))
}

export const NotificationsPlugin = {
  install(app: any) {
    app.config.globalProperties.$croquet = croquetSession(app)
  },
}
