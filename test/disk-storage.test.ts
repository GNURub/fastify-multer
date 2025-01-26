import FormData from 'form-data'
import temp from 'fs-temp'
import fs from 'node:fs'
import path from 'node:path'
import { rimraf } from 'rimraf'
import { afterEach, beforeEach, describe, expect, it } from 'vitest' // Importaciones de Vitest
import multer from '../lib'
import { file, fileSize, submitForm } from './_util'

describe('Disk Storage', () => {
  let uploadDir: string
  let upload: ReturnType<typeof multer>

  beforeEach(async () => {
    uploadDir = temp.mkdirSync()
    upload = multer({ dest: uploadDir })
  })

  afterEach(async () => {
    await rimraf(uploadDir) // Usamos async/await en lugar de callbacks
  })

  it('should process parser/form-data POST request', async () => {
    const form = new FormData()
    const parser = upload.single('small0')

    form.append('name', 'Multer')
    form.append('small0', file('small0.dat'))

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeNull() // Reemplazamos assert.ifError(err)
    expect(req.body.name).toBe('Multer') // Reemplazamos assert.equal
    expect(req.file.fieldname).toBe('small0')
    expect(req.file.originalname).toBe('small0.dat')
    expect(req.file.size).toBe(fileSize(req.file.path))
  })

  it('should process empty fields and an empty file', async () => {
    const form = new FormData()
    const parser = upload.single('empty')

    form.append('empty', file('empty.dat'))
    form.append('name', 'Multer')
    form.append('version', '')
    form.append('year', '')
    form.append('checkboxfull', 'cb1')
    form.append('checkboxfull', 'cb2')
    form.append('checkboxhalfempty', 'cb1')
    form.append('checkboxhalfempty', '')
    form.append('checkboxempty', '')
    form.append('checkboxempty', '')

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeNull()
    expect(req.body.name).toBe('Multer')
    expect(req.body.version).toBe('')
    expect(req.body.year).toBe('')
    expect(req.body.checkboxfull).toEqual(['cb1', 'cb2']) // Reemplazamos assert.deepEqual
    expect(req.body.checkboxhalfempty).toEqual(['cb1', ''])
    expect(req.body.checkboxempty).toEqual(['', ''])

    expect(req.file.fieldname).toBe('empty')
    expect(req.file.originalname).toBe('empty.dat')
    expect(req.file.size).toBe(0)
    expect(fileSize(req.file.path)).toBe(0)
  })

  it('should process multiple files', async () => {
    const form = new FormData()
    const parser = upload.fields([
      { name: 'empty', maxCount: 1 },
      { name: 'tiny0', maxCount: 1 },
      { name: 'tiny1', maxCount: 1 },
      { name: 'small0', maxCount: 1 },
      { name: 'small1', maxCount: 1 },
      { name: 'medium', maxCount: 1 },
      { name: 'large', maxCount: 1 },
    ])

    form.append('empty', file('empty.dat'))
    form.append('tiny0', file('tiny0.dat'))
    form.append('tiny1', file('tiny1.dat'))
    form.append('small0', file('small0.dat'))
    form.append('small1', file('small1.dat'))
    form.append('medium', file('medium.dat'))
    form.append('large', file('large.jpg'))

    const { req, err } = await submitForm(parser, form)

    expect(err).toBeNull()
    expect(req.body).toEqual({})

    expect(req.files['empty'][0].fieldname).toBe('empty')
    expect(req.files['empty'][0].originalname).toBe('empty.dat')
    expect(req.files['empty'][0].size).toBe(0)
    expect(fileSize(req.files['empty'][0].path)).toBe(0)

    expect(req.files['tiny0'][0].fieldname).toBe('tiny0')
    expect(req.files['tiny0'][0].originalname).toBe('tiny0.dat')
    expect(req.files['tiny0'][0].size).toBe(fileSize(req.files['tiny0'][0].path))

    expect(req.files['tiny1'][0].fieldname).toBe('tiny1')
    expect(req.files['tiny1'][0].originalname).toBe('tiny1.dat')
    expect(req.files['tiny1'][0].size).toBe(7)
    expect(fileSize(req.files['tiny1'][0].path)).toBe(7)

    expect(req.files['small0'][0].fieldname).toBe('small0')
    expect(req.files['small0'][0].originalname).toBe('small0.dat')
    expect(req.files['small0'][0].size).toBe(fileSize(req.files['small0'][0].path))

    expect(req.files['small1'][0].fieldname).toBe('small1')
    expect(req.files['small1'][0].originalname).toBe('small1.dat')
    expect(req.files['small1'][0].size).toBe(fileSize(req.files['small1'][0].path))

    expect(req.files['medium'][0].fieldname).toBe('medium')
    expect(req.files['medium'][0].originalname).toBe('medium.dat')
    expect(req.files['medium'][0].size).toBe(fileSize(req.files['medium'][0].path))

    expect(req.files['large'][0].fieldname).toBe('large')
    expect(req.files['large'][0].originalname).toBe('large.jpg')
    expect(req.files['large'][0].size).toBe(2413677)
    expect(fileSize(req.files['large'][0].path)).toBe(2413677)
  })

  it('should remove uploaded files on error', async () => {
    const form = new FormData()
    const parser = upload.single('tiny0')

    form.append('tiny0', file('tiny0.dat'))
    form.append('small0', file('small0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('LIMIT_UNEXPECTED_FILE')
    expect(err.field).toBe('small0')
    expect(err.storageErrors).toEqual([])

    const files = fs.readdirSync(uploadDir)
    expect(files).toEqual([])
  })

  it("should report error when directory doesn't exist", async () => {
    const directory = path.join(temp.mkdirSync(), 'ghost')
    function dest(_$0, _$1, cb) {
      cb(null, directory)
    }

    const storage = multer.diskStorage({ destination: dest })
    const localUpload = multer({ storage: storage })
    const parser = localUpload.single('tiny0')
    const form = new FormData()

    form.append('tiny0', file('tiny0.dat'))

    const { err } = await submitForm(parser, form)

    expect(err.code).toBe('ENOENT')
    expect(path.dirname(err.path)).toBe(directory)
  })
})
