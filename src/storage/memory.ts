import { type FastifyRequest } from 'fastify'
import { File, StorageEngine } from '../interfaces'

class MemoryStorage implements StorageEngine {
  _handleFile(
    _req: FastifyRequest,
    file: File,
    cb: (error: Error | null, info?: Partial<File>) => void,
  ): void {
    const chunks: Buffer[] = []

    // Collect chunks of data from the stream
    file.stream!.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    // When the stream ends, concatenate the chunks into a single buffer
    file.stream!.on('end', () => {
      const buffer = Buffer.concat(chunks)
      cb(null, {
        buffer: buffer,
        size: buffer.length,
      })
    })

    // Handle stream errors
    file.stream!.on('error', (err: Error) => {
      cb(err)
    })
  }

  _removeFile(_req: FastifyRequest, file: File, cb: (error?: Error) => void) {
    delete file.buffer
    cb(undefined)
  }
}

export default () => new MemoryStorage()
