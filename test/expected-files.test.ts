import FormData from 'form-data'
import { beforeAll, describe, expect, it } from 'vitest' // Importaciones de Vitest
import multer from '../lib'
import { file, submitForm } from './_util'

describe('Expected files', () => {
  let upload: ReturnType<typeof multer>

  beforeAll(() => {
    upload = multer() // Inicializa multer antes de todas las pruebas
  })

  it('should reject single unexpected file', async () => {
    const form = new FormData()
    const parser = upload.single('butme')

    form.append('notme', file('small0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE') // Reemplaza assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
    expect(err.field).toBe('notme') // Reemplaza assert.equal(err.field, 'notme')
  })

  it('should reject array of multiple files', async () => {
    const form = new FormData()
    const parser = upload.array('butme', 4)

    form.append('notme', file('small0.dat'))
    form.append('notme', file('small1.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE') // Reemplaza assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
    expect(err.field).toBe('notme') // Reemplaza assert.equal(err.field, 'notme')
  })

  it('should reject overflowing arrays', async () => {
    const form = new FormData()
    const parser = upload.array('butme', 1)

    form.append('butme', file('small0.dat'))
    form.append('butme', file('small1.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE') // Reemplaza assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
    expect(err.field).toBe('butme') // Reemplaza assert.equal(err.field, 'butme')
  })

  it('should accept files with expected fieldname', async () => {
    const form = new FormData()
    const parser = upload.fields([
      { name: 'butme', maxCount: 2 },
      { name: 'andme', maxCount: 2 },
    ])

    form.append('butme', file('small0.dat'))
    form.append('butme', file('small1.dat'))
    form.append('andme', file('empty.dat'))

    const { err, req } = await submitForm(parser, form)

    expect(err).toBeNull() // Reemplaza assert.ifError(err)

    expect(req.files['butme'].length).toBe(2) // Reemplaza assert.equal(req.files['butme'].length, 2)
    expect(req.files['andme'].length).toBe(1) // Reemplaza assert.equal(req.files['andme'].length, 1)
  })

  it('should reject files with unexpected fieldname', async () => {
    const form = new FormData()
    const parser = upload.fields([
      { name: 'butme', maxCount: 2 },
      { name: 'andme', maxCount: 2 },
    ])

    form.append('butme', file('small0.dat'))
    form.append('butme', file('small1.dat'))
    form.append('andme', file('empty.dat'))
    form.append('notme', file('empty.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE') // Reemplaza assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE')
    expect(err.field).toBe('notme') // Reemplaza assert.equal(err.field, 'notme')
  })

  it('should allow any file to come thru', async () => {
    const form = new FormData()
    const parser = upload.any()

    form.append('butme', file('small0.dat'))
    form.append('butme', file('small1.dat'))
    form.append('andme', file('empty.dat'))

    const { err, req } = await submitForm(parser, form)

    expect(err).toBeNull() // Reemplaza assert.ifError(err)
    expect(req.files.length).toBe(3) // Reemplaza assert.equal(req.files.length, 3)
    expect(req.files[0].fieldname).toBe('butme') // Reemplaza assert.equal(req.files[0].fieldname, 'butme')
    expect(req.files[1].fieldname).toBe('butme') // Reemplaza assert.equal(req.files[1].fieldname, 'butme')
    expect(req.files[2].fieldname).toBe('andme') // Reemplaza assert.equal(req.files[2].fieldname, 'andme')
  })
})
