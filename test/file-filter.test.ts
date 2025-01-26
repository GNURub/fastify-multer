import FormData from 'form-data'
import { describe, expect, it } from 'vitest'
import multer from '../lib'
import { file, submitForm } from './_util'

function withFilter(fileFilter: any) {
  return multer({ fileFilter })
}

function skipSpecificFile(_req: any, f: any, cb: any) {
  cb(null, f.fieldname !== 'notme')
}

function reportFakeError(_req: any, _: any, cb: any) {
  cb(new Error('Fake error'))
}

describe('File Filter', () => {
  it('should skip some files', async () => {
    const form = new FormData()
    const upload = withFilter(skipSpecificFile)
    const parser = upload.fields([
      { name: 'notme', maxCount: 1 },
      { name: 'butme', maxCount: 1 },
    ])

    form.append('notme', file('tiny0.dat'))
    form.append('butme', file('tiny1.dat'))

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeNull()
    expect(req.files['notme']).toBeUndefined()
    expect(req.files['butme'][0].fieldname).toBe('butme')
    expect(req.files['butme'][0].originalname).toBe('tiny1.dat')
    expect(req.files['butme'][0].size).toBe(7)
    expect(req.files['butme'][0].buffer.length).toBe(7)
  })

  it('should report errors from fileFilter', async () => {
    const form = new FormData()
    const upload = withFilter(reportFakeError)
    const parser = upload.single('test')

    form.append('test', file('tiny0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.message).toBe('Fake error')
  })
})
