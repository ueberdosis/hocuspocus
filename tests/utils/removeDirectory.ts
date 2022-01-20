import fs from 'fs'
import path from 'path'

export const removeDirectory = (dir: string) => {
  try {
    const list = fs.readdirSync(dir)

    for (let i = 0; i < list.length; i += 1) {
      const filename = path.join(dir, list[i])
      const stat = fs.statSync(filename)

      if (filename === '.' || filename === '..') {
        // pass these files
      } else if (stat.isDirectory()) {
        // rmdir recursively
        removeDirectory(filename)
      } else {
        // rm fiilename
        fs.unlinkSync(filename)
      }
    }

    fs.rmdirSync(dir)
  } catch {
    //
  }
}
