import FormData from 'form-data'
import temp from 'fs-temp'
import path from 'node:path'
import { rimraf } from 'rimraf'
import { afterAll, describe, expect, it } from 'vitest'
import multer from '../lib'
import { file, fileSize, submitForm } from './_util'

function generateFilename(_req: any, f: any, cb: any) {
  cb(null, f.fieldname + f.originalname)
}

describe('Functionality', () => {
  const cleanup: string[] = []

  function makeStandardEnv(): Promise<{ upload: any; uploadDir: string; form: FormData }> {
    return new Promise((resolve, reject) => {
      temp.mkdir((err, uploadDir) => {
        if (err) {
          return reject(err)
        }

        cleanup.push(uploadDir!)

        const storage = multer.diskStorage({
          destination: uploadDir,
          filename: generateFilename,
        })

        resolve({
          upload: multer({ storage: storage }),
          uploadDir: uploadDir!,
          form: new FormData(),
        })
      })
    })
  }

  afterAll(() => {
    while (cleanup.length) {
      rimraf.sync(cleanup.pop()!)
    }
  })

  it('should upload the file to the `dest` dir', async () => {
    const env = await makeStandardEnv()
    const parser = env.upload.single('small0')
    env.form.append('small0', file('small0.dat'))

    const { req, err } = await submitForm(parser, env.form)

    expect(err).toBeNull()
    expect(req.file.path.startsWith(env.uploadDir)).toBe(true)
    expect(req.file.size).toBe(fileSize(req.file.path))
  })

  it('should rename the uploaded file', async () => {
    const env = await makeStandardEnv()
    const parser = env.upload.single('small0')
    env.form.append('small0', file('small0.dat'))

    const { req, err } = await submitForm(parser, env.form)

    expect(err).toBeNull()
    expect(req.file.filename).toBe('small0small0.dat')
  })

  it('should ensure all req.files values (single-file per field) point to an array', async () => {
    const env = await makeStandardEnv()
    const parser = env.upload.single('tiny0')
    env.form.append('tiny0', file('tiny0.dat'))

    const { req, err } = await submitForm(parser, env.form)

    expect(err).toBeNull()
    expect(req.file.filename).toBe('tiny0tiny0.dat')
  })

  it('should ensure all req.files values (multi-files per field) point to an array', async () => {
    const env = await makeStandardEnv()
    const parser = env.upload.array('themFiles', 2)
    env.form.append('themFiles', file('small0.dat'))
    env.form.append('themFiles', file('small1.dat'))

    const { req, err } = await submitForm(parser, env.form)

    expect(err).toBeNull()
    expect(req.files.length).toBe(2)
    expect(req.files[0].filename).toBe('themFilessmall0.dat')
    expect(req.files[1].filename).toBe('themFilessmall1.dat')
  })

  it('should rename the destination directory to a different directory', async () => {
    const storage = multer.diskStorage({
      destination: function (_req: any, _f: any, cb: any) {
        temp.template('testforme-%s').mkdir((err, uploadDir) => {
          if (err) {
            return cb(err, '')
          }

          cleanup.push(uploadDir!)
          cb(null, uploadDir!)
        })
      },
      filename: generateFilename,
    })

    const form = new FormData()
    const upload = multer({ storage: storage })
    const parser = upload.array('themFiles', 2)

    form.append('themFiles', file('small0.dat'))
    form.append('themFiles', file('small1.dat'))

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeNull()
    expect(req.files.length).toBe(2)
    expect(req.files[0].path.includes(path.sep + 'testforme-')).toBe(true)
    expect(req.files[1].path.includes(path.sep + 'testforme-')).toBe(true)
  })
})
