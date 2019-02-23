import { IncomingMessage, Server, ServerResponse } from 'http'
import { FastifyRequest, FastifyMiddleware } from 'fastify'
import makeBeforeHandler from './lib/make-beforehandler'
import diskStorage from './storage/disk'
import memoryStorage from './storage/memory'
import MulterError from './lib/multer-error'
import fastifyPlugin from './lib/fastify-plugin'

import {
  Field,
  File,
  Options,
  FileFilter,
  FileFilterCallback,
  Setup,
  StorageEngine,
} from './interfaces'
import { Strategy } from './lib/file-appender'

function allowAll(req: FastifyRequest<IncomingMessage>, file: File, cb: FileFilterCallback) {
  cb(null, true)
}

class Multer {
  storage: StorageEngine
  limits: Options['limits']
  preservePath: Options['preservePath']
  fileFilter: FileFilter
  contentParser: typeof fastifyPlugin

  constructor(options: Options) {
    if (options.storage) {
      this.storage = options.storage
    } else if (options.dest) {
      this.storage = diskStorage({ destination: options.dest })
    } else {
      this.storage = memoryStorage()
    }

    this.limits = options.limits
    this.preservePath = options.preservePath
    this.fileFilter = options.fileFilter || allowAll
    this.contentParser = fastifyPlugin
  }

  private _makeBeforeHandler(fields: Field[], fileStrategy: Strategy) {
    const setup: Setup = () => {
      const fileFilter = this.fileFilter
      const filesLeft = Object.create(null)

      fields.forEach(function(field) {
        if (typeof field.maxCount === 'number') {
          filesLeft[field.name] = field.maxCount
        } else {
          filesLeft[field.name] = Infinity
        }
      })

      function wrappedFileFilter(
        req: FastifyRequest<IncomingMessage>,
        file: File,
        cb: FileFilterCallback,
      ) {
        if ((filesLeft[file.fieldname] || 0) <= 0) {
          return cb(new MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
        }

        filesLeft[file.fieldname] -= 1
        fileFilter(req, file, cb)
      }

      return {
        limits: this.limits,
        preservePath: this.preservePath,
        storage: this.storage,
        fileFilter: wrappedFileFilter,
        fileStrategy,
      }
    }

    return makeBeforeHandler(setup)
  }

  single(name: string): FastifyMiddleware<Server, IncomingMessage, ServerResponse> {
    return this._makeBeforeHandler([{ name, maxCount: 1 }], 'VALUE')
  }

  array(
    name: string,
    maxCount?: number,
  ): FastifyMiddleware<Server, IncomingMessage, ServerResponse> {
    return this._makeBeforeHandler([{ name, maxCount }], 'ARRAY')
  }

  fields(fields: Field[]): FastifyMiddleware<Server, IncomingMessage, ServerResponse> {
    return this._makeBeforeHandler(fields, 'OBJECT')
  }

  none(): FastifyMiddleware<Server, IncomingMessage, ServerResponse> {
    return this._makeBeforeHandler([], 'NONE')
  }

  any(): FastifyMiddleware<Server, IncomingMessage, ServerResponse> {
    const setup: Setup = () => ({
      limits: this.limits,
      preservePath: this.preservePath,
      storage: this.storage,
      fileFilter: this.fileFilter,
      fileStrategy: 'ARRAY',
    })

    return makeBeforeHandler(setup)
  }
}

export function multer(options?: Options) {
  if (options === undefined) {
    return new Multer({})
  }

  if (typeof options === 'object' && options !== null) {
    return new Multer(options)
  }

  throw new TypeError('Expected object for argument options')
}

export default multer
export { default as contentParser } from './lib/fastify-plugin'
export { default as diskStorage } from './storage/disk'
export { default as memoryStorage } from './storage/memory'
export { default as MulterError } from './lib/multer-error'
