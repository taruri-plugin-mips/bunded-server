import {resolve} from 'pathe'
import { createWriteStream } from 'node:fs'
import { pipeline, PassThrough } from 'node:stream'

export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)
  // not file upload
  if (!body) {
    throw createError({
      status: 422,
      statusMessage: "Bad Request",
      message: "Not Found multipart file upload",
      data: { file: "none" }
    })
  }
  // save file to disk
  const folder = useRuntimeConfig(event).folder

  const allFiles = body.filter((item) => item.type)

  const filePromise = allFiles.map((item) => {
    const fileName = item.filename
    // todo: reg to version and create folder
    const filePath = resolve(folder, fileName)
    // write stream
    const writeStream = createWriteStream(filePath)
    let data = item.data as Buffer

    const readStream = new PassThrough().end(data)

    return new Promise((resolve, reject) => {
      pipeline(readStream, writeStream, (err) => {
        if (err) {
          reject(err)
          return
        }

        resolve({
          url: `http://localhost:3000/uploads/${fileName}`,
          type: item.type
        })
      })
    })
  })

  let res = await Promise.all(filePromise)
  return res
})


