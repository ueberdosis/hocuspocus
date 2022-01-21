import fs from 'fs'

export const createDirectory = (dir: string) => {
  try {
    fs.mkdir(dir, () => {})
  } catch {
    //
  }
}
