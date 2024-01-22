import { Tag } from 'biketag/dist/common/schema'

export type BackgroundProcessResults = {
  results: any[]
  errors: boolean
}

export type activeQueue = {
  queuedTags: Tag[]
  completedTags: Tag[]
  timedOutTags: Tag[]
}
