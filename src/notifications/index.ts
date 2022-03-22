import { createApp } from 'vue'
import * as Croquet from '@croquet/croquet'
import { Event, Payload } from '@/common/types'

let instace: any

export const getInstance = () => instace

export const croquetSession = (app: any) => {
  if (instace) return instace

  class BikeTagNotificationsModel extends Croquet.Model {
    init() {
      for (const value in Event) {
        this.subscribe('notification', value, this.pubNotification)
      }
    }

    pubNotification(payload: Payload) {
      if (
        app.config.globalProperties.$store.getters.getProfile?.user_metadata?.name !== payload.from
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
    startTime: string = new Date().toUTCString()

    init() {
      this.subscribe('notification', Event.addFoundTag, this.pubNotification)
      this.subscribe('notification', Event.addMysteryTag, this.pubNotification)
      this.subscribe('notification', Event.approveTag, this.approveTagNotification)
      this.subscribe('notification', Event.dequeueTag, this.dequeueTagNotification)
    }

    getData(payload: Payload) {
      return {
        playerName:
          app.config.globalProperties.$store.getters.getProfile?.user_metadata?.name ??
          app.config.globalProperties.$store.getters.getPlayerTag?.foundPlayer,
        timeRegion:
          new Date(payload.created) > new Date(this.startTime) &&
          payload.region === app.config.globalProperties.$store.getters.getGame?.region?.name,
      }
    }

    showToast(msg: string, type = 'success') {
      app.config.globalProperties.$toast[type](msg, {
        position: 'bottom',
      })
    }

    pubNotification(payload: Payload) {
      const { playerName, timeRegion } = this.getData(payload)
      if (playerName !== payload.from && timeRegion) {
        this.showToast(payload.msg)
      }
    }

    approveTagNotification(payload: Payload) {
      const { playerName, timeRegion } = this.getData(payload)
      if (playerName === payload.to && timeRegion) {
        this.showToast('Your tag has been approved.')
      } else if (playerName !== payload.from && timeRegion) {
        this.showToast(payload.msg)
      }
    }

    dequeueTagNotification(payload: Payload) {
      const { playerName, timeRegion } = this.getData(payload)
      if (playerName === payload.to && timeRegion) {
        this.showToast('Your tag has been removed.', 'error')
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
      this.publish('notification', payload.type, payload)
    }
  }

  class NotificationsPlugin {
    session: Croquet.CroquetSession<BikeTagNotificationsView>
    constructor(session: Croquet.CroquetSession<BikeTagNotificationsView>) {
      this.session = session
    }

    sendNotification(msg: string, storeAction: string, to = 'all') {
      if (Event[storeAction]) {
        this.session.view.sendNotification({
          to,
          msg,
          type: Event[storeAction],
          from:
            app.config.globalProperties.$store.getters.getProfile?.user_metadata?.name ??
            app.config.globalProperties.$store.getters.getPlayerTag?.foundPlayer,
          created: new Date().toUTCString(),
          region: app.config.globalProperties.$store.getters.getGame?.region?.name,
        })
      }
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
