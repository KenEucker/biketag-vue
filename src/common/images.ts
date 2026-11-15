export const getImgurImageSized = (imgurUrl = '', size = 'm') => {
  return imgurUrl
    .replace('.jpg', `${size}.jpg`)
    .replace('.jpeg', `${size}.jpg`)
    .replace('.gif', `${size}.gif`)
    .replace('.png', `${size}.png`)
    .replace('.webp', `${size}.webp`)
    .replace('.mp4', `${size}.mp4`)
}

export const getS3ImageSized = (
  imageUrl: string = '',
  size: 'small' | 'medium' | 'original' = 'original',
): string => {
  if (!imageUrl || size === 'original') return imageUrl

  if (/digitaloceanspaces\.com/.test(imageUrl)) {
    const isMainFolder = /\/main\//.test(imageUrl)
    const ext = imageUrl.match(/(\.[a-z0-9]+)(?:\?.*)?$/i)?.[1]?.toLowerCase() ?? ''
    const base = imageUrl.replace(/(_small|_medium)?\.[a-z0-9]+(?:\?.*)?$/i, '')

    // Main folder images are always webp with webp variants.
    if (isMainFolder) {
      return `${base}_${size}.webp`
    }

    // Queue webp images may have webp variants after optional processing.
    if (ext === '.webp') {
      return `${base}_${size}.webp`
    }

    // Queue jpg/png/etc: use the uploaded original as-is.
    return imageUrl
  }

  return imageUrl.replace(/(_small|_medium)?(\.\w+)$/, `_${size}$2`)
}

export const getImageSized = (
  imageUrl = '',
  size: 's' | 'm' | 'l' | 'o' | undefined = 'm',
): string => {
  const sizeMap: Record<string, 'small' | 'medium' | 'original'> = {
    s: 'small',
    m: 'medium',
    l: 'original',
    o: 'original',
  }

  const resolvedSize = sizeMap[size] || 'original'

  // Short-circuit based on image URL
  if (/imgur\.com/.test(imageUrl)) {
    return getImgurImageSized(imageUrl, size)
  }

  if (/(digitaloceanspaces\.com|amazonaws\.com)/.test(imageUrl)) {
    return getS3ImageSized(imageUrl, resolvedSize)
  }

  return imageUrl
}
