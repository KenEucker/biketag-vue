import { Game, Tag, Player } from 'biketag/lib/common/schema'

export type DomainInfo = {
  host: string
  subdomain: string | undefined
  isSubdomain: boolean
}

export const special = [
  'zeroth',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
]
export const deca = ['twent', 'thirt', 'fort', 'fift', 'sixt', 'sevent', 'eight', 'ninet']

export interface State {
  game: Game
  gameName: string
  playerId: string
  ambassadorId: string
  currentBikeTag: Tag
  tags: Tag[]
  queuedTags: Tag[]
  players: Player[]
  leaderboard: Player[]
  html: string
  formStep: number
  queuedTag: Tag
  isBikeTagAmbassador: boolean
}

export enum BiketagFormSteps {
  queueView = 1,
  queueFound = 2,
  queueJoined = 3,
  queueMystery = 4,
  queueSubmit = 5,
  queuePosted = 6,
  queueApprove = 7,
}

export enum Settings {
  AutoPost = 'queue::autoPost',
  Jingle = 'easter::jingle',
  SupportsReddit = 'social::reddit',
  SupportsTwitter = 'social::twitter',
  SupportsInstagram = 'social::instagram',
}
