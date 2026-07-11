export type ScreeningImageRole = 'found' | 'mystery'

export type ScreeningResult =
  | {
      accepted: true
    }
  | {
      accepted: false
      reason: string
    }

export type RejectedQueueImage = {
  key: string
  url: string
  smallUrl: string
  mediumUrl: string
  type: ScreeningImageRole
  tagnumber: number
  playerId?: string
  playerIp?: string
  foundPlayer?: string
  mysteryPlayer?: string
  reason: string
  rejectedAt?: number
}

export type PlayerRejectedUpload = {
  type: ScreeningImageRole
  imageUrl: string
  reason: string
}
