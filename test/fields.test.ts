import { preHandlerHookHandler } from 'fastify'
import FormData from 'form-data'
import assert from 'node:assert'
import stream from 'node:stream'
import testData from 'testdata-w3c-json-form'
import { beforeAll, describe, expect, it } from 'vitest'
import multer from '../lib'
import { submitForm } from './_util'

describe('Fields', () => {
  let parser: preHandlerHookHandler

  beforeAll(() => {
    parser = multer().fields([])
  })

  it('should process multiple fields', async () => {
    const form = new FormData()

    form.append('name', 'Multer')
    form.append('key', 'value')
    form.append('abc', 'xyz')

    const { req, err } = await submitForm(parser, form)

    assert.ifError(err)
    expect(req.body).toEqual({
      name: 'Multer',
      key: 'value',
      abc: 'xyz',
    })
  })

  it('should process empty fields', async () => {
    const form = new FormData()

    form.append('name', 'Multer')
    form.append('key', '')
    form.append('abc', '')
    form.append('checkboxfull', 'cb1')
    form.append('checkboxfull', 'cb2')
    form.append('checkboxhalfempty', 'cb1')
    form.append('checkboxhalfempty', '')
    form.append('checkboxempty', '')
    form.append('checkboxempty', '')

    const { req, err } = await submitForm(parser, form)

    assert.ifError(err)
    expect(req.body).toEqual({
      name: 'Multer',
      key: '',
      abc: '',
      checkboxfull: ['cb1', 'cb2'],
      checkboxhalfempty: ['cb1', ''],
      checkboxempty: ['', ''],
    })
  })

  it('should not process non-multipart POST request', async () => {
    const req = new stream.PassThrough() as stream.PassThrough & { method: string; headers: any }

    req.end('name=Multer')
    req.method = 'POST'
    req.headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': 11,
    }

    await new Promise<void>((resolve, reject) => {
      ;(parser as any)({ raw: req }, null, err => {
        assert.ifError(err)
        expect(req.hasOwnProperty('body')).toBe(false)
        expect(req.hasOwnProperty('files')).toBe(false)
        resolve()
      })
    })
  })

  it('should not process non-multipart GET request', async () => {
    const req = new stream.PassThrough() as stream.PassThrough & { method: string; headers: any }

    req.end('name=Multer')
    req.method = 'GET'
    req.headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': 11,
    }

    await new Promise<void>((resolve, reject) => {
      ;(parser as any)({ raw: req }, null, err => {
        assert.ifError(err)
        expect(req.hasOwnProperty('body')).toBe(false)
        expect(req.hasOwnProperty('files')).toBe(false)
        resolve()
      })
    })
  })

  testData.forEach(test => {
    it(`should handle ${test.name}`, async () => {
      const form = new FormData()

      test.fields.forEach(field => {
        form.append(field.key, field.value)
      })

      const { req, err } = await submitForm(parser, form)

      assert.ifError(err)
      expect(req.body).toEqual(test.expected)
    })
  })

  it('should convert arrays into objects', async () => {
    const form = new FormData()

    form.append('obj[0]', 'a')
    form.append('obj[2]', 'c')
    form.append('obj[x]', 'yz')

    const { req, err } = await submitForm(parser, form)

    assert.ifError(err)
    expect(req.body).toEqual({
      obj: {
        '0': 'a',
        '2': 'c',
        x: 'yz',
      },
    })
  })
})
