import * as Croquet from '@croquet/croquet'

class Notification extends Croquet.Model {
  protected message!: string
  init() {
    this.message = ''
    this.subscribe('notification', 'sendNotification', this.sendNotification)
  }
  sendNotification(message: string) {
    this.message = message
    this.publish('notification', 'changed')
  }
}
Notification.register('Notification')
