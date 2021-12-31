/* eslint-disable */
/* tslint:disable */
const BOTS = [
  '\\+https:\\/\\/developers.google.com\\/\\+\\/web\\/snippet\\/',
  'googlebot',
  'baiduspider',
  'gurujibot',
  'yandexbot',
  'slurp',
  'msnbot',
  'bingbot',
  'facebookexternalhit',
  'linkedinbot',
  'twitterbot',
  'slackbot',
  'telegrambot',
  'applebot',
  'pingdom',
  'tumblr ',
  'Embedly',
  'spbot',
]
const IS_BOT_REGEXP = new RegExp('^.*(' + BOTS.join('|') + ').*$')

export class DeviceUUID {
  options: any
  version: string
  _Versions: {
    Edge: RegExp
    Firefox: RegExp
    IE: RegExp
    Chrome: RegExp
    Chromium: RegExp
    Safari: RegExp
    Opera: RegExp
    Ps3: RegExp
    Psp: RegExp
    Amaya: RegExp
    SeaMonkey: RegExp
    OmniWeb: RegExp
    Flock: RegExp
    Epiphany: RegExp
    WinJs: RegExp
    PhantomJS: RegExp
    UC: RegExp
  }
  _Browsers: {
    Edge: RegExp
    Amaya: RegExp
    Konqueror: RegExp
    Epiphany: RegExp
    SeaMonkey: RegExp
    Flock: RegExp
    OmniWeb: RegExp
    Chromium: RegExp
    Chrome: RegExp
    Safari: RegExp
    IE: RegExp
    Opera: RegExp
    PS3: RegExp
    PSP: RegExp
    Firefox: RegExp
    WinJs: RegExp
    PhantomJS: RegExp
    UC: RegExp
  }
  _OS: {
    Windows10: RegExp
    Windows81: RegExp
    Windows8: RegExp
    Windows7: RegExp
    UnknownWindows: RegExp
    WindowsVista: RegExp
    Windows2003: RegExp
    WindowsXP: RegExp
    Windows2000: RegExp
    WindowsPhone8: RegExp
    OSXCheetah: RegExp
    OSXPuma: RegExp
    OSXJaguar: RegExp
    OSXPanther: RegExp
    OSXTiger: RegExp
    OSXLeopard: RegExp
    OSXSnowLeopard: RegExp
    OSXLion: RegExp
    OSXMountainLion: RegExp
    OSXMavericks: RegExp
    OSXYosemite: RegExp
    OSXElCapitan: RegExp
    OSXSierra: RegExp
    Mac: RegExp
    Linux: RegExp
    Linux64: RegExp
    ChromeOS: RegExp
    Wii: RegExp
    PS3: RegExp
    PSP: RegExp
    iPad: RegExp
    iPhone: RegExp
    Bada: RegExp
    Curl: RegExp
  }
  _Platform: {
    Windows: RegExp
    WindowsPhone: RegExp
    Mac: RegExp
    Linux: RegExp
    Wii: RegExp
    Playstation: RegExp
    iPad: RegExp
    iPod: RegExp
    iPhone: RegExp
    Android: RegExp
    Blackberry: RegExp
    Samsung: RegExp
    Curl: RegExp
  }
  DefaultAgent: {
    isAuthoritative: boolean
    isMobile: boolean
    isTablet: boolean
    isiPad: boolean
    isiPod: boolean
    isiPhone: boolean
    isAndroid: boolean
    isBlackberry: boolean
    isOpera: boolean
    isIE: boolean
    isEdge: boolean
    isIECompatibilityMode: boolean
    isSafari: boolean
    isFirefox: boolean
    isWebkit: boolean
    isChrome: boolean
    isKonqueror: boolean
    isOmniWeb: boolean
    isSeaMonkey: boolean
    isFlock: boolean
    isAmaya: boolean
    isPhantomJS: boolean
    isEpiphany: boolean
    isDesktop: boolean
    isWindows: boolean
    isLinux: boolean
    isLinux64: boolean
    isMac: boolean
    isChromeOS: boolean
    isBada: boolean
    isSamsung: boolean
    isRaspberry: boolean
    isBot: boolean
    isCurl: boolean
    isAndroidTablet: boolean
    isWinJs: boolean
    isKindleFire: boolean
    isSilk: boolean
    isCaptive: boolean
    isSmartTV: boolean
    isUC: boolean
    isTouchScreen: boolean
    silkAccelerated: boolean
    colorDepth: number
    pixelDepth: number
    resolution: never[]
    cpuCores: number
    language: string
    browser: string
    version: string
    os: string
    platform: string
    geoIp: {}
    source: string
    hashInt: (string: any) => number
    hashMD5: (string: any) => string
  }
  public Agent: any

  constructor(options: any = {}) {
    const defOptions: any = {
      version: false,
      language: false,
      platform: true,
      os: true,
      pixelDepth: true,
      colorDepth: true,
      resolution: false,
      isAuthoritative: true,
      silkAccelerated: true,
      isKindleFire: true,
      isDesktop: true,
      isMobile: true,
      isTablet: true,
      isWindows: true,
      isLinux: true,
      isLinux64: true,
      isChromeOS: true,
      isMac: true,
      isiPad: true,
      isiPhone: true,
      isiPod: true,
      isAndroid: true,
      isSamsung: true,
      isSmartTV: true,
      isRaspberry: true,
      isBlackberry: true,
      isTouchScreen: true,
      isOpera: false,
      isIE: false,
      isEdge: false,
      isIECompatibilityMode: false,
      isSafari: false,
      isFirefox: false,
      isWebkit: false,
      isChrome: false,
      isKonqueror: false,
      isOmniWeb: false,
      isSeaMonkey: false,
      isFlock: false,
      isAmaya: false,
      isPhantomJS: false,
      isEpiphany: false,
      source: false,
      cpuCores: false,
    }
    for (const key in options) {
      if (options.hasOwnProperty(key) && typeof defOptions[key] !== 'undefined') {
        defOptions[key] = options[key]
      }
    }
    this.options = defOptions
    this.version = '1.0.0'
    this._Versions = {
      Edge: /Edge\/([\d\w\.\-]+)/i,
      Firefox: /firefox\/([\d\w\.\-]+)/i,
      IE: /msie\s([\d\.]+[\d])|trident\/\d+\.\d+;.*[rv:]+(\d+\.\d)/i,
      Chrome: /chrome\/([\d\w\.\-]+)/i,
      Chromium: /(?:chromium|crios)\/([\d\w\.\-]+)/i,
      Safari: /version\/([\d\w\.\-]+)/i,
      Opera: /version\/([\d\w\.\-]+)|OPR\/([\d\w\.\-]+)/i,
      Ps3: /([\d\w\.\-]+)\)\s*$/i,
      Psp: /([\d\w\.\-]+)\)?\s*$/i,
      Amaya: /amaya\/([\d\w\.\-]+)/i,
      SeaMonkey: /seamonkey\/([\d\w\.\-]+)/i,
      OmniWeb: /omniweb\/v([\d\w\.\-]+)/i,
      Flock: /flock\/([\d\w\.\-]+)/i,
      Epiphany: /epiphany\/([\d\w\.\-]+)/i,
      WinJs: /msapphost\/([\d\w\.\-]+)/i,
      PhantomJS: /phantomjs\/([\d\w\.\-]+)/i,
      UC: /UCBrowser\/([\d\w\.]+)/i,
    }
    this._Browsers = {
      Edge: /edge/i,
      Amaya: /amaya/i,
      Konqueror: /konqueror/i,
      Epiphany: /epiphany/i,
      SeaMonkey: /seamonkey/i,
      Flock: /flock/i,
      OmniWeb: /omniweb/i,
      Chromium: /chromium|crios/i,
      Chrome: /chrome/i,
      Safari: /safari/i,
      IE: /msie|trident/i,
      Opera: /opera|OPR/i,
      PS3: /playstation 3/i,
      PSP: /playstation portable/i,
      Firefox: /firefox/i,
      WinJs: /msapphost/i,
      PhantomJS: /phantomjs/i,
      UC: /UCBrowser/i,
    }
    this._OS = {
      Windows10: /windows nt 10\.0/i,
      Windows81: /windows nt 6\.3/i,
      Windows8: /windows nt 6\.2/i,
      Windows7: /windows nt 6\.1/i,
      UnknownWindows: /windows nt 6\.\d+/i,
      WindowsVista: /windows nt 6\.0/i,
      Windows2003: /windows nt 5\.2/i,
      WindowsXP: /windows nt 5\.1/i,
      Windows2000: /windows nt 5\.0/i,
      WindowsPhone8: /windows phone 8\./,
      OSXCheetah: /os x 10[._]0/i,
      OSXPuma: /os x 10[._]1(\D|$)/i,
      OSXJaguar: /os x 10[._]2/i,
      OSXPanther: /os x 10[._]3/i,
      OSXTiger: /os x 10[._]4/i,
      OSXLeopard: /os x 10[._]5/i,
      OSXSnowLeopard: /os x 10[._]6/i,
      OSXLion: /os x 10[._]7/i,
      OSXMountainLion: /os x 10[._]8/i,
      OSXMavericks: /os x 10[._]9/i,
      OSXYosemite: /os x 10[._]10/i,
      OSXElCapitan: /os x 10[._]11/i,
      OSXSierra: /os x 10[._]12/i,
      Mac: /os x/i,
      Linux: /linux/i,
      Linux64: /linux x86_64/i,
      ChromeOS: /cros/i,
      Wii: /wii/i,
      PS3: /playstation 3/i,
      PSP: /playstation portable/i,
      iPad: /\(iPad.*os (\d+)[._](\d+)/i,
      iPhone: /\(iPhone.*os (\d+)[._](\d+)/i,
      Bada: /Bada\/(\d+)\.(\d+)/i,
      Curl: /curl\/(\d+)\.(\d+)\.(\d+)/i,
    }
    this._Platform = {
      Windows: /windows nt/i,
      WindowsPhone: /windows phone/i,
      Mac: /macintosh/i,
      Linux: /linux/i,
      Wii: /wii/i,
      Playstation: /playstation/i,
      iPad: /ipad/i,
      iPod: /ipod/i,
      iPhone: /iphone/i,
      Android: /android/i,
      Blackberry: /blackberry/i,
      Samsung: /samsung/i,
      Curl: /curl/i,
    }

    this.Agent = this.DefaultAgent = {
      isAuthoritative: true,
      isMobile: false,
      isTablet: false,
      isiPad: false,
      isiPod: false,
      isiPhone: false,
      isAndroid: false,
      isBlackberry: false,
      isOpera: false,
      isIE: false,
      isEdge: false,
      isIECompatibilityMode: false,
      isSafari: false,
      isFirefox: false,
      isWebkit: false,
      isChrome: false,
      isKonqueror: false,
      isOmniWeb: false,
      isSeaMonkey: false,
      isFlock: false,
      isAmaya: false,
      isPhantomJS: false,
      isEpiphany: false,
      isDesktop: false,
      isWindows: false,
      isLinux: false,
      isLinux64: false,
      isMac: false,
      isChromeOS: false,
      isBada: false,
      isSamsung: false,
      isRaspberry: false,
      isBot: false,
      isCurl: false,
      isAndroidTablet: false,
      isWinJs: false,
      isKindleFire: false,
      isSilk: false,
      isCaptive: false,
      isSmartTV: false,
      isUC: false,
      isTouchScreen: false,
      silkAccelerated: false,
      colorDepth: -1,
      pixelDepth: -1,
      resolution: [],
      cpuCores: -1,
      language: 'unknown',
      browser: 'unknown',
      version: 'unknown',
      os: 'unknown',
      platform: 'unknown',
      geoIp: {},
      source: '',
      hashInt: function (string) {
        let hash = 0,
          i,
          chr,
          len
        if (string.length === 0) {
          return hash
        }
        for (i = 0, len = string.length; i < len; i++) {
          chr = string.charCodeAt(i)
          hash = (hash << 5) - hash + chr
          hash |= 0
        }
        return hash
      },
      hashMD5: function (string) {
        function rotateLeft(lValue: number, iShiftBits: number) {
          return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
        }

        function addUnsigned(lX: number, lY: number) {
          let lX4, lY4, lX8, lY8, lResult
          lX8 = lX & 0x80000000
          lY8 = lY & 0x80000000
          lX4 = lX & 0x40000000
          lY4 = lY & 0x40000000
          lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)

          if (lX4 & lY4) {
            return lResult ^ 0x80000000 ^ lX8 ^ lY8
          }
          if (lX4 | lY4) {
            if (lResult & 0x40000000) {
              return lResult ^ 0xc0000000 ^ lX8 ^ lY8
            } else {
              return lResult ^ 0x40000000 ^ lX8 ^ lY8
            }
          } else {
            return lResult ^ lX8 ^ lY8
          }
        }

        function gF(x: number, y: number, z: number) {
          return (x & y) | (~x & z)
        }

        function gG(x: number, y: number, z: number) {
          return (x & z) | (y & ~z)
        }

        function gH(x: number, y: number, z: number) {
          return x ^ y ^ z
        }

        function gI(x: number, y: number, z: number) {
          return y ^ (x | ~z)
        }

        function gFF(a: number, b: number, c: number, d: number, x: any, s: number, ac: number) {
          a = addUnsigned(a, addUnsigned(addUnsigned(gF(b, c, d), x), ac))
          return addUnsigned(rotateLeft(a, s), b)
        }

        function gGG(a: number, b: number, c: number, d: number, x: any, s: number, ac: number) {
          a = addUnsigned(a, addUnsigned(addUnsigned(gG(b, c, d), x), ac))
          return addUnsigned(rotateLeft(a, s), b)
        }

        function gHH(a: number, b: number, c: number, d: number, x: any, s: number, ac: number) {
          a = addUnsigned(a, addUnsigned(addUnsigned(gH(b, c, d), x), ac))
          return addUnsigned(rotateLeft(a, s), b)
        }

        function gII(a: number, b: number, c: number, d: number, x: any, s: number, ac: number) {
          a = addUnsigned(a, addUnsigned(addUnsigned(gI(b, c, d), x), ac))
          return addUnsigned(rotateLeft(a, s), b)
        }

        function convertToWordArray(string: string) {
          let lWordCount
          const lMessageLength = string.length
          const lNumberOfWordsTemp1 = lMessageLength + 8
          const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64
          const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16
          const lWordArray = new Array(lNumberOfWords - 1)
          let lBytePosition = 0
          let lByteCount = 0

          while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4
            lBytePosition = (lByteCount % 4) * 8
            lWordArray[lWordCount] =
              lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition)
            lByteCount++
          }

          lWordCount = (lByteCount - (lByteCount % 4)) / 4
          lBytePosition = (lByteCount % 4) * 8
          lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
          lWordArray[lNumberOfWords - 2] = lMessageLength << 3
          lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
          return lWordArray
        }

        function wordToHex(lValue: number) {
          let wordToHexValue = '',
            wordToHexValueTemp = '',
            lByte,
            lCount
          for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255
            wordToHexValueTemp = '0' + lByte.toString(16)
            wordToHexValue =
              wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2)
          }
          return wordToHexValue
        }

        function utf8Encode(string: string) {
          string = string.replace(/\r\n/g, '\n')
          let utftext = ''

          for (let n = 0; n < string.length; n++) {
            const c = string.charCodeAt(n)
            if (c < 128) {
              utftext += String.fromCharCode(c)
            } else if (c > 127 && c < 2048) {
              utftext += String.fromCharCode((c >> 6) | 192)
              utftext += String.fromCharCode((c & 63) | 128)
            } else {
              utftext += String.fromCharCode((c >> 12) | 224)
              utftext += String.fromCharCode(((c >> 6) & 63) | 128)
              utftext += String.fromCharCode((c & 63) | 128)
            }
          }
          return utftext
        }

        let x = []
        let k, AA, BB, CC, DD, a, b, c, d
        const S11 = 7,
          S12 = 12,
          S13 = 17,
          S14 = 22
        const S21 = 5,
          S22 = 9,
          S23 = 14,
          S24 = 20
        const S31 = 4,
          S32 = 11,
          S33 = 16,
          S34 = 23
        const S41 = 6,
          S42 = 10,
          S43 = 15,
          S44 = 21
        string = utf8Encode(string)
        x = convertToWordArray(string)
        a = 0x67452301
        b = 0xefcdab89
        c = 0x98badcfe
        d = 0x10325476

        for (k = 0; k < x.length; k += 16) {
          AA = a
          BB = b
          CC = c
          DD = d
          a = gFF(a, b, c, d, x[k + 0], S11, 0xd76aa478)
          d = gFF(d, a, b, c, x[k + 1], S12, 0xe8c7b756)
          c = gFF(c, d, a, b, x[k + 2], S13, 0x242070db)
          b = gFF(b, c, d, a, x[k + 3], S14, 0xc1bdceee)
          a = gFF(a, b, c, d, x[k + 4], S11, 0xf57c0faf)
          d = gFF(d, a, b, c, x[k + 5], S12, 0x4787c62a)
          c = gFF(c, d, a, b, x[k + 6], S13, 0xa8304613)
          b = gFF(b, c, d, a, x[k + 7], S14, 0xfd469501)
          a = gFF(a, b, c, d, x[k + 8], S11, 0x698098d8)
          d = gFF(d, a, b, c, x[k + 9], S12, 0x8b44f7af)
          c = gFF(c, d, a, b, x[k + 10], S13, 0xffff5bb1)
          b = gFF(b, c, d, a, x[k + 11], S14, 0x895cd7be)
          a = gFF(a, b, c, d, x[k + 12], S11, 0x6b901122)
          d = gFF(d, a, b, c, x[k + 13], S12, 0xfd987193)
          c = gFF(c, d, a, b, x[k + 14], S13, 0xa679438e)
          b = gFF(b, c, d, a, x[k + 15], S14, 0x49b40821)
          a = gGG(a, b, c, d, x[k + 1], S21, 0xf61e2562)
          d = gGG(d, a, b, c, x[k + 6], S22, 0xc040b340)
          c = gGG(c, d, a, b, x[k + 11], S23, 0x265e5a51)
          b = gGG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa)
          a = gGG(a, b, c, d, x[k + 5], S21, 0xd62f105d)
          d = gGG(d, a, b, c, x[k + 10], S22, 0x2441453)
          c = gGG(c, d, a, b, x[k + 15], S23, 0xd8a1e681)
          b = gGG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8)
          a = gGG(a, b, c, d, x[k + 9], S21, 0x21e1cde6)
          d = gGG(d, a, b, c, x[k + 14], S22, 0xc33707d6)
          c = gGG(c, d, a, b, x[k + 3], S23, 0xf4d50d87)
          b = gGG(b, c, d, a, x[k + 8], S24, 0x455a14ed)
          a = gGG(a, b, c, d, x[k + 13], S21, 0xa9e3e905)
          d = gGG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8)
          c = gGG(c, d, a, b, x[k + 7], S23, 0x676f02d9)
          b = gGG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a)
          a = gHH(a, b, c, d, x[k + 5], S31, 0xfffa3942)
          d = gHH(d, a, b, c, x[k + 8], S32, 0x8771f681)
          c = gHH(c, d, a, b, x[k + 11], S33, 0x6d9d6122)
          b = gHH(b, c, d, a, x[k + 14], S34, 0xfde5380c)
          a = gHH(a, b, c, d, x[k + 1], S31, 0xa4beea44)
          d = gHH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9)
          c = gHH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60)
          b = gHH(b, c, d, a, x[k + 10], S34, 0xbebfbc70)
          a = gHH(a, b, c, d, x[k + 13], S31, 0x289b7ec6)
          d = gHH(d, a, b, c, x[k + 0], S32, 0xeaa127fa)
          c = gHH(c, d, a, b, x[k + 3], S33, 0xd4ef3085)
          b = gHH(b, c, d, a, x[k + 6], S34, 0x4881d05)
          a = gHH(a, b, c, d, x[k + 9], S31, 0xd9d4d039)
          d = gHH(d, a, b, c, x[k + 12], S32, 0xe6db99e5)
          c = gHH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8)
          b = gHH(b, c, d, a, x[k + 2], S34, 0xc4ac5665)
          a = gII(a, b, c, d, x[k + 0], S41, 0xf4292244)
          d = gII(d, a, b, c, x[k + 7], S42, 0x432aff97)
          c = gII(c, d, a, b, x[k + 14], S43, 0xab9423a7)
          b = gII(b, c, d, a, x[k + 5], S44, 0xfc93a039)
          a = gII(a, b, c, d, x[k + 12], S41, 0x655b59c3)
          d = gII(d, a, b, c, x[k + 3], S42, 0x8f0ccc92)
          c = gII(c, d, a, b, x[k + 10], S43, 0xffeff47d)
          b = gII(b, c, d, a, x[k + 1], S44, 0x85845dd1)
          a = gII(a, b, c, d, x[k + 8], S41, 0x6fa87e4f)
          d = gII(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0)
          c = gII(c, d, a, b, x[k + 6], S43, 0xa3014314)
          b = gII(b, c, d, a, x[k + 13], S44, 0x4e0811a1)
          a = gII(a, b, c, d, x[k + 4], S41, 0xf7537e82)
          d = gII(d, a, b, c, x[k + 11], S42, 0xbd3af235)
          c = gII(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb)
          b = gII(b, c, d, a, x[k + 9], S44, 0xeb86d391)
          a = addUnsigned(a, AA)
          b = addUnsigned(b, BB)
          c = addUnsigned(c, CC)
          d = addUnsigned(d, DD)
        }
        const temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
        return temp.toLowerCase()
      },
    }
  }

  getBrowser(string: string | string[]) {
    switch (true) {
      case this._Browsers.Edge.test(string):
        this.Agent.isEdge = true
        return 'Edge'
      case this._Browsers.PhantomJS.test(string):
        this.Agent.isPhantomJS = true
        return 'PhantomJS'
      case this._Browsers.Konqueror.test(string):
        this.Agent.isKonqueror = true
        return 'Konqueror'
      case this._Browsers.Amaya.test(string):
        this.Agent.isAmaya = true
        return 'Amaya'
      case this._Browsers.Epiphany.test(string):
        this.Agent.isEpiphany = true
        return 'Epiphany'
      case this._Browsers.SeaMonkey.test(string):
        this.Agent.isSeaMonkey = true
        return 'SeaMonkey'
      case this._Browsers.Flock.test(string):
        this.Agent.isFlock = true
        return 'Flock'
      case this._Browsers.OmniWeb.test(string):
        this.Agent.isOmniWeb = true
        return 'OmniWeb'
      case this._Browsers.Opera.test(string):
        this.Agent.isOpera = true
        return 'Opera'
      case this._Browsers.Chromium.test(string):
        this.Agent.isChrome = true
        return 'Chromium'
      case this._Browsers.Chrome.test(string):
        this.Agent.isChrome = true
        return 'Chrome'
      case this._Browsers.Safari.test(string):
        this.Agent.isSafari = true
        return 'Safari'
      case this._Browsers.WinJs.test(string):
        this.Agent.isWinJs = true
        return 'WinJs'
      case this._Browsers.IE.test(string):
        this.Agent.isIE = true
        return 'IE'
      case this._Browsers.PS3.test(string):
        return 'ps3'
      case this._Browsers.PSP.test(string):
        return 'psp'
      case this._Browsers.Firefox.test(string):
        this.Agent.isFirefox = true
        return 'Firefox'
      case this._Browsers.UC.test(string):
        this.Agent.isUC = true
        return 'UCBrowser'
      default:
        // If the UA does not start with Mozilla guess the user agent.
        if (string.indexOf('Mozilla') !== 0 && /^([\d\w\-\.]+)\/[\d\w\.\-]+/i.test(string)) {
          this.Agent.isAuthoritative = false
          return RegExp.$1
        }
        return 'unknown'
    }
  }

  getBrowserVersion(string: string) {
    let regex
    switch (this.Agent.browser) {
      case 'Edge':
        if (this._Versions.Edge.test(string)) {
          return RegExp.$1
        }
        break
      case 'PhantomJS':
        if (this._Versions.PhantomJS.test(string)) {
          return RegExp.$1
        }
        break
      case 'Chrome':
        if (this._Versions.Chrome.test(string)) {
          return RegExp.$1
        }
        break
      case 'Chromium':
        if (this._Versions.Chromium.test(string)) {
          return RegExp.$1
        }
        break
      case 'Safari':
        if (this._Versions.Safari.test(string)) {
          return RegExp.$1
        }
        break
      case 'Opera':
        if (this._Versions.Opera.test(string)) {
          return RegExp.$1 ? RegExp.$1 : RegExp.$2
        }
        break
      case 'Firefox':
        if (this._Versions.Firefox.test(string)) {
          return RegExp.$1
        }
        break
      case 'WinJs':
        if (this._Versions.WinJs.test(string)) {
          return RegExp.$1
        }
        break
      case 'IE':
        if (this._Versions.IE.test(string)) {
          return RegExp.$2 ? RegExp.$2 : RegExp.$1
        }
        break
      case 'ps3':
        if (this._Versions.Ps3.test(string)) {
          return RegExp.$1
        }
        break
      case 'psp':
        if (this._Versions.Psp.test(string)) {
          return RegExp.$1
        }
        break
      case 'Amaya':
        if (this._Versions.Amaya.test(string)) {
          return RegExp.$1
        }
        break
      case 'Epiphany':
        if (this._Versions.Epiphany.test(string)) {
          return RegExp.$1
        }
        break
      case 'SeaMonkey':
        if (this._Versions.SeaMonkey.test(string)) {
          return RegExp.$1
        }
        break
      case 'Flock':
        if (this._Versions.Flock.test(string)) {
          return RegExp.$1
        }
        break
      case 'OmniWeb':
        if (this._Versions.OmniWeb.test(string)) {
          return RegExp.$1
        }
        break
      case 'UCBrowser':
        if (this._Versions.UC.test(string)) {
          return RegExp.$1
        }
        break
      default:
        if (this.Agent.browser !== 'unknown') {
          regex = new RegExp(this.Agent.browser + '[\\/ ]([\\d\\w\\.\\-]+)', 'i')
          if (regex.test(string)) {
            return RegExp.$1
          }
        }
    }
  }

  getOS(string: string) {
    switch (true) {
      case this._OS.WindowsVista.test(string):
        this.Agent.isWindows = true
        return 'Windows Vista'
      case this._OS.Windows7.test(string):
        this.Agent.isWindows = true
        return 'Windows 7'
      case this._OS.Windows8.test(string):
        this.Agent.isWindows = true
        return 'Windows 8'
      case this._OS.Windows81.test(string):
        this.Agent.isWindows = true
        return 'Windows 8.1'
      case this._OS.Windows10.test(string):
        this.Agent.isWindows = true
        return 'Windows 10.0'
      case this._OS.Windows2003.test(string):
        this.Agent.isWindows = true
        return 'Windows 2003'
      case this._OS.WindowsXP.test(string):
        this.Agent.isWindows = true
        return 'Windows XP'
      case this._OS.Windows2000.test(string):
        this.Agent.isWindows = true
        return 'Windows 2000'
      case this._OS.WindowsPhone8.test(string):
        return 'Windows Phone 8'
      case this._OS.Linux64.test(string):
        this.Agent.isLinux = true
        this.Agent.isLinux64 = true
        return 'Linux 64'
      case this._OS.Linux.test(string):
        this.Agent.isLinux = true
        return 'Linux'
      case this._OS.ChromeOS.test(string):
        this.Agent.isChromeOS = true
        return 'Chrome OS'
      case this._OS.Wii.test(string):
        return 'Wii'
      case this._OS.PS3.test(string):
        return 'Playstation'
      case this._OS.PSP.test(string):
        return 'Playstation'
      case this._OS.OSXCheetah.test(string):
        this.Agent.isMac = true
        return 'OS X Cheetah'
      case this._OS.OSXPuma.test(string):
        this.Agent.isMac = true
        return 'OS X Puma'
      case this._OS.OSXJaguar.test(string):
        this.Agent.isMac = true
        return 'OS X Jaguar'
      case this._OS.OSXPanther.test(string):
        this.Agent.isMac = true
        return 'OS X Panther'
      case this._OS.OSXTiger.test(string):
        this.Agent.isMac = true
        return 'OS X Tiger'
      case this._OS.OSXLeopard.test(string):
        this.Agent.isMac = true
        return 'OS X Leopard'
      case this._OS.OSXSnowLeopard.test(string):
        this.Agent.isMac = true
        return 'OS X Snow Leopard'
      case this._OS.OSXLion.test(string):
        this.Agent.isMac = true
        return 'OS X Lion'
      case this._OS.OSXMountainLion.test(string):
        this.Agent.isMac = true
        return 'OS X Mountain Lion'
      case this._OS.OSXMavericks.test(string):
        this.Agent.isMac = true
        return 'OS X Mavericks'
      case this._OS.OSXYosemite.test(string):
        this.Agent.isMac = true
        return 'OS X Yosemite'
      case this._OS.OSXElCapitan.test(string):
        this.Agent.isMac = true
        return 'OS X El Capitan'
      case this._OS.OSXSierra.test(string):
        this.Agent.isMac = true
        return 'macOS Sierra'
      case this._OS.Mac.test(string):
        this.Agent.isMac = true
        return 'OS X'
      case this._OS.iPad.test(string):
        this.Agent.isiPad = true
        return string.match(this._OS.iPad)[0].replace('_', '.')
      case this._OS.iPhone.test(string):
        this.Agent.isiPhone = true
        return string.match(this._OS.iPhone)[0].replace('_', '.')
      case this._OS.Bada.test(string):
        this.Agent.isBada = true
        return 'Bada'
      case this._OS.Curl.test(string):
        this.Agent.isCurl = true
        return 'Curl'
      default:
        return 'unknown'
    }
  }

  getPlatform(string: string) {
    switch (true) {
      case this._Platform.Windows.test(string):
        return 'Microsoft Windows'
      case this._Platform.WindowsPhone.test(string):
        this.Agent.isWindowsPhone = true
        return 'Microsoft Windows Phone'
      case this._Platform.Mac.test(string):
        return 'Apple Mac'
      case this._Platform.Curl.test(string):
        return 'Curl'
      case this._Platform.Android.test(string):
        this.Agent.isAndroid = true
        return 'Android'
      case this._Platform.Blackberry.test(string):
        this.Agent.isBlackberry = true
        return 'Blackberry'
      case this._Platform.Linux.test(string):
        return 'Linux'
      case this._Platform.Wii.test(string):
        return 'Wii'
      case this._Platform.Playstation.test(string):
        return 'Playstation'
      case this._Platform.iPad.test(string):
        this.Agent.isiPad = true
        return 'iPad'
      case this._Platform.iPod.test(string):
        this.Agent.isiPod = true
        return 'iPod'
      case this._Platform.iPhone.test(string):
        this.Agent.isiPhone = true
        return 'iPhone'
      case this._Platform.Samsung.test(string):
        this.Agent.isiSamsung = true
        return 'Samsung'
      default:
        return 'unknown'
    }
  }

  testCompatibilityMode() {
    if (this.Agent.isIE) {
      if (/Trident\/(\d)\.0/i.test(this.Agent.source)) {
        const tridentVersion = parseInt(RegExp.$1, 10)
        const version = parseInt(this.Agent.version, 10)
        if (version === 7 && tridentVersion === 7) {
          this.Agent.isIECompatibilityMode = true
          this.Agent.version = 11.0
        }

        if (version === 7 && tridentVersion === 6) {
          this.Agent.isIECompatibilityMode = true
          this.Agent.version = 10.0
        }

        if (version === 7 && tridentVersion === 5) {
          this.Agent.isIECompatibilityMode = true
          this.Agent.version = 9.0
        }

        if (version === 7 && tridentVersion === 4) {
          this.Agent.isIECompatibilityMode = true
          this.Agent.version = 8.0
        }
      }
    }
  }

  testSilk() {
    switch (true) {
      case new RegExp('silk', 'gi').test(this.Agent.source):
        this.Agent.isSilk = true
        break
      default:
    }

    if (/Silk-Accelerated=true/gi.test(this.Agent.source)) {
      this.Agent.SilkAccelerated = true
    }
    return this.Agent.isSilk ? 'Silk' : false
  }

  testKindleFire() {
    switch (true) {
      case /KFOT/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire'
      case /KFTT/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HD'
      case /KFJWI/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HD 8.9'
      case /KFJWA/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HD 8.9 4G'
      case /KFSOWI/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HD 7'
      case /KFTHWI/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HDX 7'
      case /KFTHWA/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HDX 7 4G'
      case /KFAPWI/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HDX 8.9'
      case /KFAPWA/gi.test(this.Agent.source):
        this.Agent.isKindleFire = true
        return 'Kindle Fire HDX 8.9 4G'
      default:
        return false
    }
  }

  testCaptiveNetwork() {
    switch (true) {
      case /CaptiveNetwork/gi.test(this.Agent.source):
        this.Agent.isCaptive = true
        this.Agent.isMac = true
        this.Agent.platform = 'Apple Mac'
        return 'CaptiveNetwork'
      default:
        return false
    }
  }

  testMobile() {
    switch (true) {
      case this.Agent.isWindows:
      case this.Agent.isLinux:
      case this.Agent.isMac:
      case this.Agent.isChromeOS:
        this.Agent.isDesktop = true
        break
      case this.Agent.isAndroid:
      case this.Agent.isSamsung:
        this.Agent.isMobile = true
        this.Agent.isDesktop = false
        break
      default:
    }
    switch (true) {
      case this.Agent.isiPad:
      case this.Agent.isiPod:
      case this.Agent.isiPhone:
      case this.Agent.isBada:
      case this.Agent.isBlackberry:
      case this.Agent.isAndroid:
      case this.Agent.isWindowsPhone:
        this.Agent.isMobile = true
        this.Agent.isDesktop = false
        break
      default:
    }
    if (/mobile/i.test(this.Agent.source)) {
      this.Agent.isMobile = true
      this.Agent.isDesktop = false
    }
  }

  testTablet() {
    switch (true) {
      case this.Agent.isiPad:
      case this.Agent.isAndroidTablet:
      case this.Agent.isKindleFire:
        this.Agent.isTablet = true
        break
    }
    if (/tablet/i.test(this.Agent.source)) {
      this.Agent.isTablet = true
    }
  }

  testNginxGeoIP(headers: { [x: string]: any }) {
    Object.keys(headers).forEach(function (key) {
      if (/^GEOIP/i.test(key)) {
        this.Agent.geoIp[key] = headers[key]
      }
    })
  }

  testBot() {
    const isBot = IS_BOT_REGEXP.exec(this.Agent.source.toLowerCase())
    if (isBot) {
      this.Agent.isBot = isBot[1]
    } else if (!this.Agent.isAuthoritative) {
      // Test unauthoritative parse for `bot` in UA to flag for bot
      this.Agent.isBot = /bot/i.test(this.Agent.source)
    }
  }

  testSmartTV() {
    const isSmartTV = new RegExp(
      'smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast.tv',
      'gi'
    ).exec(this.Agent.source.toLowerCase())
    if (isSmartTV) {
      this.Agent.isSmartTV = isSmartTV[1]
    }
  }

  testAndroidTablet() {
    if (this.Agent.isAndroid && !/mobile/i.test(this.Agent.source)) {
      this.Agent.isAndroidTablet = true
    }
  }

  testTouchSupport() {
    this.Agent.isTouchScreen =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
  }

  getLaguage() {
    this.Agent.language = (
      navigator.language ||
      navigator.userLanguage ||
      navigator.browserLanguage ||
      navigator.systemLanguage ||
      ''
    ).toLowerCase()
  }

  getColorDepth() {
    this.Agent.colorDepth = screen.colorDepth || -1
  }

  getScreenResolution() {
    this.Agent.resolution = [screen.availWidth, screen.availHeight]
  }

  getPixelDepth() {
    this.Agent.pixelDepth = screen.pixelDepth || -1
  }

  getCPU() {
    this.Agent.cpuCores = navigator.hardwareConcurrency || -1
  }

  reset() {
    for (const key in this.DefaultAgent) {
      if (this.DefaultAgent.hasOwnProperty(key)) {
        this.Agent[key] = this.DefaultAgent[key]
      }
    }
    return ua
  }

  parse(source?: string) {
    source = source ?? navigator.userAgent
    const ua = new DeviceUUID()
    ua.Agent.source = source.replace(/^\s*/, '').replace(/\s*$/, '')
    ua.Agent.os = this.getOS(ua.Agent.source)
    ua.Agent.platform = this.getPlatform(ua.Agent.source)
    ua.Agent.browser = this.getBrowser(ua.Agent.source)
    ua.Agent.version = this.getBrowserVersion(ua.Agent.source)
    ua.testBot()
    ua.testSmartTV()
    ua.testMobile()
    ua.testAndroidTablet()
    ua.testTablet()
    ua.testCompatibilityMode()
    ua.testSilk()
    ua.testKindleFire()
    ua.testCaptiveNetwork()
    ua.testTouchSupport()
    ua.getLaguage()
    ua.getColorDepth()
    ua.getPixelDepth()
    ua.getScreenResolution()
    ua.getCPU()

    return ua.Agent
  }

  get(customData?: any) {
    let pref = 'a'
    const du = this.parse()
    const dua = []
    for (const key in this.options) {
      dua.push(du[key])
    }
    if (customData) {
      dua.push(customData)
    }
    if (!this.options.resolution && du.isMobile) {
      dua.push(du.resolution)
    }
    // 8, 9, a, b
    pref = 'b'
    const tmpUuid = du.hashMD5(dua.join(':'))
    const uuid = [
      tmpUuid.slice(0, 8),
      tmpUuid.slice(8, 12),
      '4' + tmpUuid.slice(12, 15),
      pref + tmpUuid.slice(15, 18),
      tmpUuid.slice(20),
    ]
    return uuid.join('-')
  }
}

export default DeviceUUID
