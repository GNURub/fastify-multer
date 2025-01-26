import FormData from 'form-data'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import multer from '../lib'
import { file, fileSize, submitForm } from './_util'

describe('Reuse Middleware', () => {
  let parser: any

  beforeAll(() => {
    parser = multer().array('them-files')
  })

  it('should accept multiple requests', async () => {
    const fileCounts = [9, 1, 5, 7, 2, 8, 3, 4]
    const promises = fileCounts.map(fileCount => {
      return new Promise<void>(async (resolve, reject) => {
        const form = new FormData()

        form.append('name', 'Multer')
        form.append('files', '' + fileCount)

        for (let i = 0; i < fileCount; i++) {
          form.append('them-files', file('small0.dat'))
        }

        const { req, err } = await submitForm(parser, form)
        if (err) {
          return reject(err)
        }

        expect(req.body.name).toBe('Multer')
        expect(req.body.files).toBe('' + fileCount)
        expect(req.files.length).toBe(fileCount)

        req.files.forEach((f: any) => {
          expect(f.fieldname).toBe('them-files')
          expect(f.originalname).toBe('small0.dat')
          expect(f.size).toBe(fileSize(path.resolve(__dirname, `./files/${f.originalname}`)))
          expect(f.buffer.length).toBe(
            fileSize(path.resolve(__dirname, `./files/${f.originalname}`)),
          )
        })
        resolve()
      })
    })

    await Promise.all(promises)
  })
})
