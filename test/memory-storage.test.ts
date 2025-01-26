import FormData from 'form-data'
import path from 'node:path'
import { assert, beforeAll, describe, it } from 'vitest'
import multer from '../lib'
import { file, fileSize, submitForm } from './_util'

describe('Memory Storage', () => {
  let upload

  beforeAll(() => {
    upload = multer()
  })

  it('should process multipart/form-data POST request', async () => {
    const form = new FormData()
    const parser = upload.single('small0')

    form.append('name', 'Multer')
    form.append('small0', file('small0.dat'))

    const { req } = await submitForm(parser, form)
    assert.equal(req.body.name, 'Multer')

    assert.equal(req.file.fieldname, 'small0')
    assert.equal(req.file.originalname, 'small0.dat')
    assert.equal(
      req.file.size,
      fileSize(path.resolve(__dirname, `./files/${req.file.originalname}`)),
    )
    assert.equal(
      req.file.buffer.length,
      fileSize(path.resolve(__dirname, `./files/${req.file.originalname}`)),
    )
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

    const { req } = await submitForm(parser, form)

    assert.equal(req.body.name, 'Multer')
    assert.equal(req.body.version, '')
    assert.equal(req.body.year, '')

    assert.deepEqual(req.body.checkboxfull, ['cb1', 'cb2'])
    assert.deepEqual(req.body.checkboxhalfempty, ['cb1', ''])
    assert.deepEqual(req.body.checkboxempty, ['', ''])

    assert.equal(req.file.fieldname, 'empty')
    assert.equal(req.file.originalname, 'empty.dat')
    assert.equal(req.file.size, 0)
    assert.equal(req.file.buffer.length, 0)
    assert.equal(Buffer.isBuffer(req.file.buffer), true)
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

    const { req } = await submitForm(parser, form)

    assert.deepEqual(req.body, {})

    assert.equal(req.files['empty'][0].fieldname, 'empty')
    assert.equal(req.files['empty'][0].originalname, 'empty.dat')
    assert.equal(req.files['empty'][0].size, 0)
    assert.equal(req.files['empty'][0].buffer.length, 0)

    assert.equal(req.files['tiny0'][0].fieldname, 'tiny0')
    assert.equal(req.files['tiny0'][0].originalname, 'tiny0.dat')
    assert.equal(
      req.files['tiny0'][0].size,
      fileSize(path.resolve(__dirname, `./files/${req.files['tiny0'][0].originalname}`)),
    )
    assert.equal(
      req.files['tiny0'][0].buffer.length,
      fileSize(path.resolve(__dirname, `./files/${req.files['tiny0'][0].originalname}`)),
    )

    assert.equal(req.files['tiny1'][0].fieldname, 'tiny1')
    assert.equal(req.files['tiny1'][0].originalname, 'tiny1.dat')
    assert.equal(req.files['tiny1'][0].size, 7)
    assert.equal(req.files['tiny1'][0].buffer.length, 7)

    assert.equal(req.files['small0'][0].fieldname, 'small0')
    assert.equal(req.files['small0'][0].originalname, 'small0.dat')
    assert.equal(
      req.files['small0'][0].size,
      fileSize(path.resolve(__dirname, `./files/${req.files['small0'][0].originalname}`)),
    )
    assert.equal(
      req.files['small0'][0].buffer.length,
      fileSize(path.resolve(__dirname, `./files/${req.files['small0'][0].originalname}`)),
    )

    assert.equal(req.files['small1'][0].fieldname, 'small1')
    assert.equal(req.files['small1'][0].originalname, 'small1.dat')
    assert.equal(
      req.files['small1'][0].size,
      fileSize(path.resolve(__dirname, `./files/${req.files['small1'][0].originalname}`)),
    )
    assert.equal(
      req.files['small1'][0].buffer.length,
      fileSize(path.resolve(__dirname, `./files/${req.files['small1'][0].originalname}`)),
    )

    assert.equal(req.files['medium'][0].fieldname, 'medium')
    assert.equal(req.files['medium'][0].originalname, 'medium.dat')
    assert.equal(
      req.files['medium'][0].size,
      fileSize(path.resolve(__dirname, `./files/${req.files['medium'][0].originalname}`)),
    )
    assert.equal(
      req.files['medium'][0].buffer.length,
      fileSize(path.resolve(__dirname, `./files/${req.files['medium'][0].originalname}`)),
    )

    assert.equal(req.files['large'][0].fieldname, 'large')
    assert.equal(req.files['large'][0].originalname, 'large.jpg')
    assert.equal(req.files['large'][0].size, 2413677)
    assert.equal(req.files['large'][0].buffer.length, 2413677)
  })
})
