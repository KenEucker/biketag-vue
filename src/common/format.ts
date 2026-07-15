import { deca, special } from './constants'

export const stringifyNumber = (n: number): string => {
  if (n < 20) return special[n]
  if (n % 10 === 0) return deca[Math.floor(n / 10) - 2] + 'ieth'
  return deca[Math.floor(n / 10) - 2] + 'y-' + special[n % 10]
}

// https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
export const ordinalSuffixOf = (n: number) => {
  const j = n % 10,
    k = n % 100
  if (j == 1 && k != 11) {
    return n + 'st'
  }
  if (j == 2 && k != 12) {
    return n + 'nd'
  }
  if (j == 3 && k != 13) {
    return n + 'rd'
  }
  return n + 'th'
}
