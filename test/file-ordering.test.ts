import FormData from 'form-data'
import { describe, expect, it } from 'vitest'
import multer from '../lib'
import { file, submitForm } from './_util'

describe('File ordering', () => {
  it('should present files in same order as they came', async () => {
    const storage = multer.memoryStorage()
    const upload = multer({ storage: storage })
    const parser = upload.array('themFiles', 2)

    let i = 0
    const calls: any[] = [{}, {}]
    let pending = 2
    const _handleFile = storage._handleFile

    storage._handleFile = function (req, f, cb) {
      const id = i++

      _handleFile.call(this, req, f, function (err, info) {
        if (err) {
          return cb(err)
        }

        calls[id].cb = cb
        calls[id].info = info

        if (--pending === 0) {
          calls[1].cb(null, calls[1].info)
          calls[0].cb(null, calls[0].info)
        }
      })
    }

    const form = new FormData()

    form.append('themFiles', file('small0.dat'))
    form.append('themFiles', file('small1.dat'))

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeNull()
    expect(req.files.length).toBe(2)
    expect(req.files[0].originalname).toBe('small0.dat')
    expect(req.files[1].originalname).toBe('small1.dat')
  })
})
