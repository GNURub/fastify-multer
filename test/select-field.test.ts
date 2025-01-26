import FormData from 'form-data'
import { beforeAll, describe, expect, it } from 'vitest'
import multer from '../lib'
import { file, submitForm } from './_util'

function generateForm() {
  const form = new FormData()

  form.append('CA$|-|', file('empty.dat'))
  form.append('set-1', file('tiny0.dat'))
  form.append('set-1', file('empty.dat'))
  form.append('set-1', file('tiny1.dat'))
  form.append('set-2', file('tiny1.dat'))
  form.append('set-2', file('tiny0.dat'))
  form.append('set-2', file('empty.dat'))

  return form
}

function assertSet(files: any[], setName: string, fileNames: string[]) {
  const len = fileNames.length

  expect(files.length).toBe(len)

  for (let i = 0; i < len; i++) {
    expect(files[i].fieldname).toBe(setName)
    expect(files[i].originalname).toBe(fileNames[i])
  }
}

describe('Select Field', () => {
  let parser: any

  beforeAll(() => {
    parser = multer().fields([
      { name: 'CA$|-|', maxCount: 1 },
      { name: 'set-1', maxCount: 3 },
      { name: 'set-2', maxCount: 3 },
    ])
  })

  it('should select the first file with fieldname', async () => {
    const { req, err } = await submitForm(parser, generateForm())

    expect(err).toBeNull()

    let f

    f = req.files['CA$|-|'][0]
    expect(f.fieldname).toBe('CA$|-|')
    expect(f.originalname).toBe('empty.dat')

    f = req.files['set-1'][0]
    expect(f.fieldname).toBe('set-1')
    expect(f.originalname).toBe('tiny0.dat')

    f = req.files['set-2'][0]
    expect(f.fieldname).toBe('set-2')
    expect(f.originalname).toBe('tiny1.dat')
  })

  it('should select all files with fieldname', async () => {
    const { req, err } = await submitForm(parser, generateForm())

    expect(err).toBeNull()

    assertSet(req.files['CA$|-|'], 'CA$|-|', ['empty.dat'])
    assertSet(req.files['set-1'], 'set-1', ['tiny0.dat', 'empty.dat', 'tiny1.dat'])
    assertSet(req.files['set-2'], 'set-2', ['tiny1.dat', 'tiny0.dat', 'empty.dat'])
  })
})
