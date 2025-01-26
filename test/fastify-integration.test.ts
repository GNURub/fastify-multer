import Fastify from 'fastify'
import FormData from 'form-data'
import { AddressInfo } from 'net'
import onFinished from 'on-finished'
import { describe, expect, it } from 'vitest'
import multer from '../lib'
import { file } from './_util'

describe('Fastify Integration', () => {
  function submitForm(
    form: FormData,
    path: string,
    port: number,
    cb: (err: Error | null, res?: any, body?: Buffer) => void,
  ) {
    const req = form.submit('http://localhost:' + port + path)

    req.on('error', cb)
    req.on('response', function (res) {
      const chunks: Buffer[] = []

      res.on('error', cb)
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        onFinished(req, function () {
          cb(null, res, body)
        })
      })
    })
  }

  it('should work with fastify error handling', async () => {
    const limits = { fileSize: 200 }
    const upload = multer({ limits: limits })
    const form = new FormData()

    let routeCalled = 0
    let errorCalled = 0

    form.append('avatar', file('large.jpg'))
    const fastify = Fastify()

    fastify.register(multer.contentParser)

    fastify.setErrorHandler(function (error: any, _request, reply) {
      expect(error.code).toBe('LIMIT_FILE_SIZE')

      errorCalled++
      reply.code(500).send('ERROR')
    })

    fastify.route({
      method: 'POST',
      url: '/t1/profile',
      preHandler: upload.single('avatar'),
      handler: function (_request, reply) {
        routeCalled++
        reply.code(200).send('SUCCESS')
      },
    })

    await new Promise<void>((resolve, reject) => {
      fastify.listen({ port: 0 }, () => {
        submitForm(
          form,
          '/t1/profile',
          (fastify.server.address() as AddressInfo).port,
          function (err, res, body) {
            expect(err).toBeNull()

            expect(routeCalled).toBe(0)
            expect(errorCalled).toBe(1)
            expect(body?.toString()).toBe('ERROR')
            expect(res.statusCode).toBe(500)

            fastify.close(() => resolve())
          },
        )
      })
    })
  })

  it('should work when receiving error from fileFilter', async () => {
    function fileFilter(
      _req: any,
      _file: any,
      cb: (error: Error | null, acceptFile?: boolean) => void,
    ) {
      cb(new Error('TEST'))
    }

    const upload = multer({ fileFilter: fileFilter })
    const fastify = Fastify()
    const form = new FormData()

    let routeCalled = 0
    let errorCalled = 0

    form.append('avatar', file('large.jpg'))

    fastify.register(multer.contentParser)

    fastify.setErrorHandler(function (error: any, _request, reply) {
      expect(error.message).toBe('TEST')

      errorCalled++
      reply.status(500).send('ERROR')
    })

    fastify.route({
      method: 'POST',
      url: '/t2/profile',
      preHandler: upload.single('avatar'),
      handler: function (_request, reply) {
        routeCalled++
        reply.code(200).send('SUCCESS')
      },
    })

    await new Promise<void>((resolve, reject) => {
      fastify.listen({ port: 0 }, () => {
        submitForm(
          form,
          '/t2/profile',
          (fastify.server.address() as AddressInfo).port,
          function (err, res, body) {
            expect(err).toBeNull()

            expect(routeCalled).toBe(0)
            expect(errorCalled).toBe(1)
            expect(body?.toString()).toBe('ERROR')
            expect(res.statusCode).toBe(500)

            fastify.close(() => resolve())
          },
        )
      })
    })
  })
})
