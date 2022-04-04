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

export interface ProfileMeta {
  name: string
  passcode: string
  social: {
    reddit: string
    instagram: string
    twitter: string
    imgur: string
    discord: string
  }
  options: {
    skipSteps: boolean
  }
}

export interface AmbassadorMeta extends ProfileMeta {
  credentials: {
    imgur: {
      clientId: string
      clientSecret: string
      refreshToken: string
    }
    sanity: {
      projectId: string
      dataset: string
    }
    reddit: {
      clientId: string
      clientSecret: string
      username: string
      password: string
    }
  }
}
export interface Profile {
  name: string
  sub: string
  slug: string
  token?: string
  email?: string
  locale?: string
  nonce?: string
  picture?: string
  user_metadata?: ProfileMeta
  zipcode?: string
}
export interface AmbassadorProfile extends Profile {
  address1: string
  address2: string
  city: string
  country: string
  isBikeTagAmbassador: boolean
  phone: string
  user_metadata?: AmbassadorMeta
  zipcode: string
}
export type BikeTagProfile = Partial<Profile> & Partial<AmbassadorProfile>
export interface State {
  dataInitialized: boolean
  game: Game
  allGames: Game[]
  gameName: string
  currentBikeTag: Tag
  tags: Tag[]
  tagsInRound: Tag[]
  players: Player[]
  leaderboard: Player[]
  html: string
  profile: BikeTagProfile
  formStep: number
  playerTag: Tag
  credentialsFetched: boolean
  mostRecentlyViewedTagnumber: BiketagFormSteps
}

export enum BiketagFormSteps {
  viewRound = 0.5,
  addFoundImage = 1,
  roundJoined = 1.5,
  addMysteryImage = 2,
  addNewBikeTag = 2.5,
  roundPosted = 3,
  shareBikeTagPost = 3.5,
}

export enum Settings {
  AutoPost = 'queue::autoPost',
  Jingle = 'easter::jingle',
  SupportsReddit = 'social::reddit',
  SupportsTwitter = 'social::twitter',
  SupportsInstagram = 'social::instagram',
}

export enum BikeTagEvent {
  addFoundTag = 'addFoundTag',
  addMysteryTag = 'addMysteryTag',
  approveTag = 'approveTag',
  dequeueTag = 'dequeueTag',
}
export interface BikeTagEventPayload {
  to: string
  from: string
  id: string
  created: string
  region: string
  msg: string
  type: BikeTagEvent
}
