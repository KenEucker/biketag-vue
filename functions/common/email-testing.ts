import type { Tag } from 'biketag'

export const emailTestTemplates = [
  { name: 'post-new-biketag', label: 'New submission' },
  { name: 'approve-new-biketag', label: 'Submission approved' },
  { name: 'biketag-auto-posted', label: 'Round published' },
  { name: 'post-biketag-screening-rejection', label: 'Image screening rejection' },
  { name: 'post-tag-error', label: 'Submission error' },
  { name: 'approve-tag-error', label: 'Approval error' },
  { name: 'game-setting-change-request', label: 'Setting change request' },
]

export type EmailTestContext = { queuedTag?: Tag; currentTag?: Tag; logo?: string }

/** Use live tags where available without performing submission or approval actions. */
export const getEmailTestData = (game: string, host: string, context: EmailTestContext = {}) => {
  const image = `${host}/images/biketag-example-1.webp`
  const data = {
    game,
    gameProper: game.charAt(0).toUpperCase() + game.slice(1),
    host,
    gameHost: host,
    logo: context.logo || `${host}/images/email-logo.png`,
    subdomainIcon: context.logo || `${host}/images/email-logo.png`,
    ambassadorsUrl: `${host}/approve`,
    rejectionsUrl: `${host}/rejections`,
    tag: { tagnumber: 42, foundPlayer: 'Test Rider' },
    newBikeTagPost: { tagnumber: 42, mysteryImageUrl: image },
    foundImageUrl: image,
    mysteryImageUrl: image,
    currentMysteryImageUrl: image,
    imageSize: 'm',
    mainTitleText: 'This is a test submission for round #42.',
    mainParagraphText: 'This test email uses sample content. No game action was performed.',
    foundLocation: 'Sample park entrance',
    foundTagBlurb: 'Test Rider found the sample location.',
    comparisonText: 'Compare the sample found photo with the current mystery below.',
    currentMysteryHint: 'Look near the park.',
    currentMysteryBlurb: 'A sample mystery location for email testing.',
    goToApproveButton: 'REVIEW SUBMISSIONS',
    goToQueueButton: 'OPEN QUEUE',
    footerText: 'BikeTag email test — no game action was performed.',
    roundPublishedText: `Test round #42 is live in ${game}.`,
    redditLink: '',
    blueskyLink: '',
    instagramLink: '',
    roundNumber: 42,
    imageType: 'found',
    imageUrl: image,
    playerId: 'test-rider',
    playerIP: '192.0.2.1',
    playerIp: '192.0.2.1',
    reason: 'Sample reason for testing the email layout.',
    payload: JSON.stringify({ test: true, message: 'Sample error for email testing' }, null, 2),
    settingName: 'AutoPost timer',
    settingKey: 'queue::autoPost',
    settingDescription: 'Sample game setting.',
    currentValue: '15',
    requestedValue: '30',
    ambassadorName: 'Test Ambassador',
    ambassadorEmail: 'ambassador@example.org',
  }

  if (context.currentTag) {
    const tag = context.currentTag
    data.newBikeTagPost = tag
    data.currentMysteryImageUrl = tag.mysteryImageUrl || ''
    data.currentMysteryHint = tag.hint || ''
    data.currentMysteryBlurb = `Current round #${tag.tagnumber}${tag.mysteryPlayer ? ` by ${tag.mysteryPlayer}` : ''}.`
    data.roundPublishedText = `Round #${tag.tagnumber} is now live in ${game}. This is a test email.`
  }

  if (context.queuedTag) {
    const tag = context.queuedTag
    data.tag = tag
    data.foundImageUrl = tag.foundImageUrl || ''
    data.mysteryImageUrl = tag.mysteryImageUrl || ''
    data.mainTitleText = `Test submission for round #${tag.tagnumber}.`
    data.mainParagraphText = `This test email uses a queued submission for round #${tag.tagnumber}. No game action was performed.`
    data.foundLocation = tag.foundLocation?.trim() || 'Location not provided'
    data.foundTagBlurb = tag.foundPlayer
      ? `Submitted by ${tag.foundPlayer}.`
      : 'Player not provided.'
    data.comparisonText = context.currentTag?.mysteryImageUrl
      ? 'Compare the queued found photo with the current mystery below.'
      : 'Open the queue to review the submission photos and location.'
    // Do not show a sample mystery as though it were the live comparison photo.
    if (!context.currentTag) {
      data.currentMysteryImageUrl = ''
      data.currentMysteryHint = ''
      data.currentMysteryBlurb = ''
    }
  }

  return data
}
