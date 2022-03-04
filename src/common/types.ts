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

export interface Profile {
  name: string
  sub: string
  slug: string
  token?: string
  email?: string
  locale?: string
  nonce?: string
  picture?: string
  user_metadata?: any
  zipcode?: string
}

export interface AmbassadorProfile {
  name: string
  sub: string
  slug: string
  address1: string
  address2: string
  city: string
  country: string
  email: string
  isBikeTagAmbassador: boolean
  locale: string
  nonce: string
  phone: string
  picture: string
  user_metadata: any
  zipcode: string
}
export type BikeTagProfile = Partial<Profile> & Partial<AmbassadorProfile>
export interface State {
  game: Game
  allGames: Game[]
  gameName: string
  playerId: string
  currentBikeTag: Tag
  tags: Tag[]
  queuedTags: Tag[]
  players: Player[]
  leaderboard: Player[]
  html: string
  profile: BikeTagProfile
  formStep: number
  queuedTag: Tag
  isBikeTagAmbassador: boolean
  mostRecentlyViewedTagnumber: number
}

export enum BiketagFormSteps {
  queueView = 1,
  queueFound = 2,
  queueJoined = 3,
  queueMystery = 4,
  queueSubmit = 5,
  queuePosted = 6,
  queuePostedShare = 6.5,
  queueApprove = 7,
}

export enum Settings {
  AutoPost = 'queue::autoPost',
  Jingle = 'easter::jingle',
  SupportsReddit = 'social::reddit',
  SupportsTwitter = 'social::twitter',
  SupportsInstagram = 'social::instagram',
}
