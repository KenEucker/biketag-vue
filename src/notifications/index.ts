import { createApp } from 'vue'
import * as Croquet from '@croquet/croquet'
import { Notifications, Payload } from '@/common/types'

let instace: any

export const getInstance = () => instace

export const croquetSession = (app: any) => {
  if (instace) return instace

  class BikeTagNotificationsModel extends Croquet.Model {
    init() {
      for (const value in Notifications) {
        this.subscribe('notification', value, this.pubNotification)
      }
    }

    pubNotification(payload: Payload) {
      if (
        app.config.globalProperties.$store.getters.getProfile?.user_metadata?.name !== payload.name
      ) {
        app.config.globalProperties.$toast.success(payload.msg, {
          position: 'top',
        })
      }
    }
  }

  BikeTagNotificationsModel.register('BikeTagNotificationsModel')
  class BikeTagNotificationsView extends Croquet.View {
    model: BikeTagNotificationsModel
    constructor(model: BikeTagNotificationsModel) {
      super(model)
      this.model = model
    }

    sendNotification(payload: Payload) {
      this.publish('notification', 'foundTag', payload)
    }
  }

  instace = createApp({
    data() {
      return {
        session: null,
      }
    },
    async created() {
      this.session = await Croquet.Session.join({
        apiKey: process.env.C_AKEY ?? '',
        appId: process.env.HOST ?? '',
        name: process.env.C_SNAME ?? 'biketag',
        password: process.env.C_SPASS ?? 'secret',
        model: BikeTagNotificationsModel,
        view: BikeTagNotificationsView,
      })
    },
    methods: {
      sendNotification(payload: any) {
        this.session?.view.sendNotification(payload) //error
      },
    },
  }).mount(document.createElement('div'))

  return instace
}

export const NotificationsPlugin = {
  install(app: any) {
    app.config.globalProperties.$croquet = croquetSession(app)
  },
}

export const createSession = async (app: any) => {
  class BikeTagNotificationsModel extends Croquet.Model {
    startTime: Date = new Date()

    init() {
      for (const value in Notifications) {
        this.subscribe('notification', value, this.pubNotification)
      }
    }

    pubNotification(payload: Payload) {
      if (
        app.config.globalProperties.$store.getters.getProfile?.user_metadata?.name !==
          payload.name &&
        new Date(payload.created) > this.startTime &&
        payload.region === app.config.globalProperties.$store.getters.getGame?.region
      ) {
        app.config.globalProperties.$toast.success(payload.msg, {
          position: 'top',
        })
      }
    }
  }

  BikeTagNotificationsModel.register('BikeTagNotificationsModel')
  class BikeTagNotificationsView extends Croquet.View {
    model: BikeTagNotificationsModel
    constructor(model: BikeTagNotificationsModel) {
      super(model)
      this.model = model
    }

    sendNotification(payload: Payload) {
      this.publish('notification', Notifications.foundTag, payload)
    }
  }

  class NotificationsPlugin {
    session: Croquet.CroquetSession<BikeTagNotificationsView>
    constructor(session: Croquet.CroquetSession<BikeTagNotificationsView>) {
      this.session = session
      // this.sendNotification({
      //   name: 'example', type: Notifications.foundTag, msg: 'EXAMPLE',
      //   created: new Date().toUTCString(), region: app.config.globalProperties.$store.getters.getGame?.region
      // })
    }

    sendNotification(payload: Payload) {
      this.session.view.sendNotification(payload)
    }
  }

  return new NotificationsPlugin(
    await Croquet.Session.join({
      apiKey: process.env.C_AKEY ?? '',
      appId: process.env.HOST ?? '',
      name: process.env.C_SNAME ?? 'biketag',
      password: process.env.C_SPASS ?? 'secret',
      model: BikeTagNotificationsModel,
      view: BikeTagNotificationsView,
    })
  )
}
