import fs from 'node:fs'
import path from 'node:path'
import stream from 'node:stream'
import onFinished from 'on-finished'

export function file(name: string) {
  return fs.createReadStream(path.join(__dirname, 'files', name))
}

export function fileSize(p: string) {
  return fs.statSync(p).size
}

export function submitForm(multer: any, form: any): Promise<{ req: any; err: any }> {
  return new Promise(resolve => {
    form.getLength(function (err: Error, length: number) {
      if (err) {
        return resolve({
          err,
          req: null,
        })
      }

      const req = new stream.PassThrough() as stream.PassThrough & {
        complete: boolean
        headers: any
      }

      req.complete = false
      form.once('end', function () {
        req.complete = true
      })

      form.pipe(req)
      req.headers = {
        'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
        'content-length': length,
      }

      const request = { raw: req }
      multer(request, null, function (error: Error) {
        onFinished(req as any, function () {
          if (error) {
            return resolve({ err: error, req: request })
          }

          resolve({ req: request, err: null })
        })
      })
    })
  })
}
