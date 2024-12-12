import { mkdir } from 'node:fs'

export function useCreateFolder(folderPath: string) {
  return new Promise((resolve, reject) => {
    mkdir(folderPath, { recursive: true }, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve(folderPath)
    })
  })
}
