import FormData from 'form-data'
import os from 'node:os'
import stream from 'node:stream'
import { describe, expect, it } from 'vitest' // Importaciones de Vitest
import multer from '../lib'
import { file, submitForm } from './_util'

function withLimits(limits: any, fields: any) {
  const storage = multer.memoryStorage()
  return multer({ storage: storage, limits: limits }).fields(fields)
}

describe('Error Handling', () => {
  it("should be an instance of both `Error` and `MulterError` classes in case of the Multer's error", async () => {
    const form = new FormData()
    const storage = multer.diskStorage({ destination: os.tmpdir() })
    const upload = multer({ storage: storage }).fields([{ name: 'small0', maxCount: 1 }])

    form.append('small0', file('small0.dat'))
    form.append('small0', file('small0.dat'))

    const { err } = await submitForm(upload, form)

    expect(err).toBeInstanceOf(Error) // Reemplaza assert.equal(err instanceof Error, true)
    expect(err).toBeInstanceOf(multer.MulterError) // Reemplaza assert.equal(err instanceof multer.MulterError, true)
  })

  it('should respect parts limit', async () => {
    const form = new FormData()
    const parser = withLimits({ parts: 1 }, [{ name: 'small0', maxCount: 1 }])

    form.append('field0', 'BOOM!')
    form.append('small0', file('small0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_PART_COUNT') // Reemplaza assert.equal(err.code, 'LIMIT_PART_COUNT')
  })

  it('should respect file size limit', async () => {
    const form = new FormData()
    const parser = withLimits({ fileSize: 1500 }, [
      { name: 'tiny0', maxCount: 1 },
      { name: 'small0', maxCount: 1 },
    ])

    form.append('tiny0', file('tiny0.dat'))
    form.append('small0', file('small0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_FILE_SIZE') // Reemplaza assert.equal(err.code, 'LIMIT_FILE_SIZE')
    expect(err.field).toBe('small0') // Reemplaza assert.equal(err.field, 'small0')
  })

  it('should respect file count limit', async () => {
    const form = new FormData()
    const parser = withLimits({ files: 1 }, [
      { name: 'small0', maxCount: 1 },
      { name: 'small1', maxCount: 1 },
    ])

    form.append('small0', file('small0.dat'))
    form.append('small1', file('small1.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_FILE_COUNT') // Reemplaza assert.equal(err.code, 'LIMIT_FILE_COUNT')
  })

  it('should respect file key limit', async () => {
    const form = new FormData()
    const parser = withLimits({ fieldNameSize: 4 }, [{ name: 'small0', maxCount: 1 }])

    form.append('small0', file('small0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_FIELD_KEY') // Reemplaza assert.equal(err.code, 'LIMIT_FIELD_KEY')
  })

  it('should respect field key limit', async () => {
    const form = new FormData()
    const parser = withLimits({ fieldNameSize: 4 }, [])

    form.append('ok', 'SMILE')
    form.append('blowup', 'BOOM!')

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_FIELD_KEY') // Reemplaza assert.equal(err.code, 'LIMIT_FIELD_KEY')
  })

  it('should respect field value limit', async () => {
    const form = new FormData()
    const parser = withLimits({ fieldSize: 16 }, [])

    form.append('field0', 'This is okay')
    form.append('field1', 'This will make the parser explode')

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_FIELD_VALUE') // Reemplaza assert.equal(err.code, 'LIMIT_FIELD_VALUE')
    expect(err.field).toBe('field1') // Reemplaza assert.equal(err.field, 'field1')
  })

  it('should respect field count limit', async () => {
    const form = new FormData()
    const parser = withLimits({ fields: 1 }, [])

    form.append('field0', 'BOOM!')
    form.append('field1', 'BOOM!')

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_FIELD_COUNT') // Reemplaza assert.equal(err.code, 'LIMIT_FIELD_COUNT')
  })

  it('should respect fields given', async () => {
    const form = new FormData()
    const parser = withLimits(undefined, [{ name: 'wrongname', maxCount: 1 }])

    form.append('small0', file('small0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE') // Reemplaza assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
    expect(err.field).toBe('small0') // Reemplaza assert.equal(err.field, 'small0')
  })

  it('should report errors from storage engines', async () => {
    const storage = multer.memoryStorage()

    storage._removeFile = function _removeFile(_req, _res, cb) {
      const err: any = new Error('Test error')
      err.code = 'TEST'
      cb(err)
    }

    const form = new FormData()
    const upload = multer({ storage: storage })
    const parser = upload.single('tiny0')

    form.append('tiny0', file('tiny0.dat'))
    form.append('small0', file('small0.dat'))

    const { err, req } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE') // Reemplaza assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
    expect(err.field).toBe('small0') // Reemplaza assert.equal(err.field, 'small0')

    expect(err.storageErrors.length).toBe(1) // Reemplaza assert.equal(err.storageErrors.length, 1)
    expect(err.storageErrors[0].code).toBe('TEST') // Reemplaza assert.equal(err.storageErrors[0].code, 'TEST')
    expect(err.storageErrors[0].field).toBe('tiny0') // Reemplaza assert.equal(err.storageErrors[0].field, 'tiny0')
    expect(err.storageErrors[0].file).toBe(req.file) // Reemplaza assert.equal(err.storageErrors[0].file, req.file)
  })

  it('should report errors from busboy constructor', async () => {
    const req = new stream.PassThrough() as stream.PassThrough & { headers: any }
    const storage = multer.memoryStorage()
    const upload: any = multer({ storage: storage }).single('tiny0')
    const body = 'test'

    req.headers = {
      'content-type': 'multipart/form-data',
      'content-length': body.length,
    }

    req.end(body)
    const request = { raw: req }

    await new Promise<void>((resolve, reject) => {
      upload(request, null, err => {
        if (err) {
          expect(err.message).toBe('Multipart: Boundary not found') // Reemplaza assert.equal(err.message, 'Multipart: Boundary not found')
          resolve()
        } else {
          reject(new Error('Expected an error'))
        }
      })
    })
  })

  it('should report errors from busboy parsing', async () => {
    const req = new stream.PassThrough() as stream.PassThrough & { headers: any }
    const storage = multer.memoryStorage()
    const upload: any = multer({ storage: storage }).single('tiny0')
    const boundary = 'AaB03x'
    const body = [
      '--' + boundary,
      'Content-Disposition: form-data; name="tiny0"; filename="test.txt"',
      'Content-Type: text/plain',
      '',
      'test without end boundary',
    ].join('\r\n')

    req.headers = {
      'content-type': 'multipart/form-data; boundary=' + boundary,
      'content-length': body.length,
    }

    req.end(body)

    await new Promise<void>((resolve, reject) => {
      upload({ raw: req }, null, err => {
        if (err) {
          expect(err.message).toBe('Unexpected end of multipart data') // Reemplaza assert.equal(err.message, 'Unexpected end of multipart data')
          resolve()
        } else {
          reject(new Error('Expected an error'))
        }
      })
    })
  })

  it('should gracefully handle more than one error at a time', async () => {
    const form = new FormData()
    const storage = multer.diskStorage({ destination: os.tmpdir() })
    const upload = multer({ storage: storage, limits: { fileSize: 1, files: 1 } }).fields([
      { name: 'small0', maxCount: 1 },
    ])

    form.append('small0', file('small0.dat'))
    form.append('small0', file('small0.dat'))

    const { err } = await submitForm(upload, form)

    expect(err.code).toBe('LIMIT_FILE_SIZE') // Reemplaza assert.equal(err.code, 'LIMIT_FILE_SIZE')
  })
})
