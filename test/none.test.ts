import FormData from 'form-data'
import { beforeAll, describe, expect, it } from 'vitest'
import multer from '../lib'
import { file, submitForm } from './_util'

describe('None', () => {
  let parser: any

  beforeAll(() => {
    parser = multer().none()
  })

  it('should not allow file uploads', async () => {
    const form = new FormData()

    form.append('key1', 'val1')
    form.append('key2', 'val2')
    form.append('file', file('small0.dat'))

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeDefined()
    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE')
    expect(req.files).toBeUndefined()
    expect(req.body['key1']).toBe('val1')
    expect(req.body['key2']).toBe('val2')
  })

  it('should handle text fields', async () => {
    const form = new FormData()

    form.append('key1', 'val1')
    form.append('key2', 'val2')

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeNull()
    expect(req.files).toBeUndefined()
    expect(req.body['key1']).toBe('val1')
    expect(req.body['key2']).toBe('val2')
  })
})
