import FormData from 'form-data'
import temp from 'fs-temp'
import { rimraf } from 'rimraf'
import { afterAll, assert, beforeAll, describe, it } from 'vitest'
import multer from '../lib'
import { file, submitForm } from './_util'

describe('Issue #232', () => {
  let uploadDir, upload

  beforeAll(() => {
    uploadDir = temp.mkdirSync()
    upload = multer({ dest: uploadDir, limits: { fileSize: 100 } })
  })

  afterAll(() => {
    return rimraf(uploadDir)
  })

  it('should report limit errors', async () => {
    const form = new FormData()
    const parser = upload.single('file')

    form.append('file', file('large.jpg'))

    const { err } = await submitForm(parser, form)
    assert.ok(err, 'an error was given')
    assert.equal(err.code, 'LIMIT_FILE_SIZE')
    assert.equal(err.field, 'file')
  })
})
