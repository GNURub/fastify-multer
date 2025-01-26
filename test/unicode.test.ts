import FormData from 'form-data'
import temp from 'fs-temp'
import path from 'node:path'
import { rimraf } from 'rimraf'
import { afterEach, assert, beforeEach, describe, it } from 'vitest'
import multer from '../lib'
import { file, fileSize, submitForm } from './_util'

describe('Unicode', () => {
  let uploadDir, upload

  beforeEach(() => {
    uploadDir = temp.mkdirSync()
    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: (_req, f, cb) => {
        cb(null, f.originalname)
      },
    })

    upload = multer({ storage })
  })

  afterEach(async () => {
    await rimraf(uploadDir)
  })

  it('should handle unicode filenames', async () => {
    const form = new FormData()
    const parser = upload.single('small0')
    const filename = '\ud83d\udca9.dat'

    form.append('small0', file('small0.dat'), { filename })

    const { req, err } = await submitForm(parser, form)

    assert(!err)

    assert.equal(path.basename(req.file.path), filename)
    assert.equal(req.file.originalname, filename)

    assert.equal(req.file.fieldname, 'small0')
    assert.equal(req.file.size, fileSize(req.file.path))
  })
})
