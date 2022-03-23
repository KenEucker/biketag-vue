import { createApp } from 'vue'
import * as Croquet from '@croquet/croquet'
import { Event, Payload } from '@/common/types'
import { getBikeTagHash } from '@/common/utils'

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
  const time = new Date().toUTCString()
  class BikeTagNotificationsModel extends Croquet.Model {
    startTime: string = time
    idRecord: string[] = []

    init() {
      this.subscribe('notification', Event.addFoundTag, this.pubNotification)
      this.subscribe('notification', Event.addMysteryTag, this.pubNotification)
      this.subscribe('notification', Event.approveTag, this.approveTagNotification)
      this.subscribe('notification', Event.dequeueTag, this.dequeueTagNotification)
    }

    getData(payload: Payload) {
      return {
        playerId:
          app.config.globalProperties.$store.getters.getProfile?.sub,
        timeRegion:
          new Date(payload.created) > new Date(this.startTime) &&
          payload.region === app.config.globalProperties.$store.getters.getGame?.region?.name,
      }
    }

    recordId(payload: Payload) {
      if (this.idRecord.includes(payload.id)) {
        return false
      } else {
        this.idRecord.push(payload.id)
        return true
      }
    }

    showToast(msg: string, type = 'success') {
      app.config.globalProperties.$toast[type](msg, {
        position: 'bottom',
        duration: 5
      })
    }

    pubNotification(payload: Payload) {
      const { playerId, timeRegion } = this.getData(payload)
      if (playerId !== payload.from && timeRegion && this.recordId(payload)) {
        this.showToast(payload.msg)
      }
    }

    approveTagNotification(payload: Payload) {
      const { playerId, timeRegion } = this.getData(payload)
      const isIdrecorder = this.recordId(payload)
      if (isIdrecorder && timeRegion) {
        if (playerId === payload.to) {
          this.showToast('Your tag has been approved.')
        } else if (playerId !== payload.from) {
          this.showToast(payload.msg)
        }
      }
    }

    dequeueTagNotification(payload: Payload) {
      const { playerId, timeRegion } = this.getData(payload)
      if (playerId === payload.to && timeRegion && this.recordId(payload)) {
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
          id: getBikeTagHash(new Date().toUTCString()),
          type: Event[storeAction],
          from:
            app.config.globalProperties.$store.getters.getProfile?.sub,
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
