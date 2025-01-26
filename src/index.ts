import 'fastify'
import { type FastifyRequest, preHandlerHookHandler } from 'fastify'
import { contentParser, isMultipart } from './lib/content-parser'
import { makePreHandler } from './lib/make-prehandler'
import { MulterError } from './lib/multer-error'
import { diskStorage } from './storage/disk'
import { memoryStorage } from './storage/memory'

import {
  Field,
  File,
  FileFilter,
  FileFilterCallback,
  FilesObject,
  Options,
  Setup,
  StorageEngine,
} from './interfaces'
import { Strategy } from './lib/file-appender'

type FilesInRequest = FilesObject | Partial<File>[]

declare module 'fastify' {
  interface FastifyRequest {
    isMultipart: typeof isMultipart
    file: File
    files: FilesInRequest
  }
}

/**
 * Default file filter that allows all files.
 */
function allowAll(_req: FastifyRequest, _file: File, cb: FileFilterCallback): void {
  cb(null, true)
}

class Multer {
  storage: StorageEngine
  limits: Options['limits']
  preservePath: Options['preservePath']
  fileFilter: FileFilter
  contentParser: typeof contentParser

  constructor(options: Options = {}) {
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
    this.contentParser = contentParser
  }

  /**
   * Creates a pre-handler function for handling file uploads.
   */
  private _makePreHandler(fields: Field[], fileStrategy: Strategy): preHandlerHookHandler {
    const setup: Setup = () => {
      const fileFilter = this.fileFilter
      const filesLeft = Object.create(null)

      fields.forEach(field => {
        filesLeft[field.name] = typeof field.maxCount === 'number' ? field.maxCount : Infinity
      })

      const wrappedFileFilter = (req: FastifyRequest, file: File, cb: FileFilterCallback): void => {
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

    return makePreHandler(setup)
  }

  /**
   * Handles a single file upload.
   */
  single(name: string): preHandlerHookHandler {
    return this._makePreHandler([{ name, maxCount: 1 }], 'VALUE')
  }

  /**
   * Handles multiple files for a single field.
   */
  array(name: string, maxCount?: number): preHandlerHookHandler {
    return this._makePreHandler([{ name, maxCount }], 'ARRAY')
  }

  /**
   * Handles multiple fields with multiple files.
   */
  fields(fields: Field[]): preHandlerHookHandler {
    return this._makePreHandler(fields, 'OBJECT')
  }

  /**
   * Handles no file uploads.
   */
  none(): preHandlerHookHandler {
    return this._makePreHandler([], 'NONE')
  }

  /**
   * Handles any file uploads.
   */
  any(): preHandlerHookHandler {
    const setup: Setup = () => ({
      limits: this.limits,
      preservePath: this.preservePath,
      storage: this.storage,
      fileFilter: this.fileFilter,
      fileStrategy: 'ARRAY',
    })

    return makePreHandler(setup)
  }
}

interface MulterFactory {
  (options?: Options): Multer
  contentParser: typeof contentParser
  diskStorage: typeof diskStorage
  memoryStorage: typeof memoryStorage
  MulterError: typeof MulterError
  default: MulterFactory
}

/**
 * Factory function to create a Multer instance.
 */
const multer = ((options?: Options): Multer => {
  if (options === undefined) {
    return new Multer({})
  }

  if (typeof options === 'object' && options !== null) {
    return new Multer(options)
  }

  throw new TypeError('Expected object for argument options')
}) as MulterFactory

multer.contentParser = contentParser
multer.diskStorage = diskStorage
multer.memoryStorage = memoryStorage
multer.MulterError = MulterError
multer.default = multer

export default multer

export { contentParser, diskStorage, memoryStorage, MulterError }
