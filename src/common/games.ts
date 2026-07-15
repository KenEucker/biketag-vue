import type { Game } from 'biketag/dist/common/schema'

export const getSupportedGames = (games: Game[]) => {
  const isImgurSupported = (g: Game) =>
    g.mainhash?.length && g.archivehash?.length && g.queuehash?.length
  const isAwsSupported = (g: Game) => g.awsRegion?.length

  return games.filter((g: Game) => (isImgurSupported(g) || isAwsSupported(g)) && g.logo?.length)
}
