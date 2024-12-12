import type { Buffer } from 'node:buffer'
import { createWriteStream } from 'node:fs'
import { PassThrough, pipeline } from 'node:stream'
import AdmZip from 'adm-zip'
import { remove } from 'fs-extra'
import path, { resolve } from 'pathe'
import { useCreateFolder } from '~/utils/useCreateFolder'

export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)
  // not file upload
  if (!body) {
    throw createError({
      status: 422,
      statusMessage: 'Bad Request',
      message: 'Not Found multipart file upload',
      data: { file: 'none' },
    })
  }
  // save file to disk
  const folder = useRuntimeConfig(event).folder

  const allFiles = body.filter(item => item.type)

  const filePromise = allFiles.map(async (item) => {
    const fileName = item.filename
    // filename is ${project-name}-${version}-release.zip
    // eslint-disable-next-line regexp/no-super-linear-backtracking, regexp/no-misleading-capturing-group
    const regex = /(.+)-(.+)-release\.zip/
    // want get project-name and version
    const match = fileName.match(regex)
    if (!match) {
      throw createError({
        status: 422,
        statusMessage: 'Bad Request',
        message: 'Invalid file name',
        data: { file: fileName },
      })
    }
    const projectName = match[1]
    const version = match[2]

    // create folder if not exist
    const folderPath = resolve(folder, projectName, `v${version}`)
    await useCreateFolder(folderPath)
    const filePath = resolve(folderPath, fileName)
    // write stream
    const writeStream = createWriteStream(filePath)

    const data = item.data as Buffer

    const readStream = new PassThrough().end(data)

    return new Promise((resolve, reject) => {
      pipeline(readStream, writeStream, async (err) => {
        if (err) {
          reject(err)
          return
        }

        // create release folder
        const releaseFolder = path.resolve(folderPath, 'release')
        await useCreateFolder(releaseFolder)
        // unzip
        const zipfile = new AdmZip(filePath)
        zipfile.extractAllTo(releaseFolder, true)
        // remove zip file
        await remove(filePath)

        resolve({
          status: 'wait',
        })
      })
    })
  })

  const res = await Promise.all(filePromise)
  return res
})
