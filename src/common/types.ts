import {
  Achievement,
  Ambassador,
  Game,
  Player,
  Region,
  Setting,
  Tag,
} from 'biketag/lib/common/schema'

export type { Achievement, Ambassador, Game, Player, Region, Setting, Tag }

export type DomainInfo = {
  host: string
  subdomain: string | undefined
  isSubdomain: boolean
}

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
export interface BikeTagStoreState {
  dataInitialized: boolean
  game: Game
  allGames: Game[]
  achievements: Achievement[]
  gameName: string
  gameNameProper: string
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
  mostRecentlyViewedTagnumber: BiketagQueueFormSteps
  regionPolyon: any
}

export enum BiketagQueueFormSteps {
  viewRound = 0.5,
  addFoundImage = 1,
  roundJoined = 1.5,
  addMysteryImage = 2,
  addNewBikeTag = 2.5,
  roundPosted = 3,
  shareBikeTagPost = 3.5,
}

export enum BikeTagSettingsKeys {
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
  created: number
  region: string
  msg: string
  type: BikeTagEvent
}
