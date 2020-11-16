import multer from 'multer';
import { Request, Response, Server } from 'restify'
import { resolve as resolvePath } from 'path';
import SlidesDatabase from './database';
import * as pdf from 'pdf2pic'
import { promises as fs } from 'fs'


const tmpDir = resolvePath(__dirname, '../tmp')
const convertSettings = {
	height: 1080,
	width: 1920,
	density: 330,
	savePath: tmpDir
}

const upload = multer({
	storage: multer.diskStorage({
		destination: tmpDir,
		filename: (_, file, cb) => {
			cb(null, file.originalname)
		}
	}),
})

export default class PPTXUploader {
	constructor(private server: Server, private database: SlidesDatabase) {

		const multerMiddleware = upload.single('file')
		this.server.post('/upload',
			(req, res, next) => multerMiddleware(req as any, res as any, next),
			async (req, res) => await this.upload(req as any, res));
		this.server.get('/presentations', async (req, res) => await this.presentations(req, res))
		this.server.del('/presentations/:key', async (req, res) => await this.deletePresentation(req, res))
		this.server.get('/presentations/:key/:page', async (req, res) => await this.page(req, res))
	}

	async upload(req: Request & { file: { path: string; filename: string } }, res: Response) {
		const { path, filename } = req.file
		try {
			const file = await fs.readFile(path)
			await this.database.query(`
				INSERT INTO slide_set(name, pdf_base64) VALUES($1::text, $2::text)
			`, [filename, file.toString('base64')])

			res.send({ success: true })
		} catch (error) {
			res.send({ success: false, error })
		}
	}

	async presentations(_: Request, res: Response) {
		try {
			const results = await this.database.query(`
				SELECT name FROM slide_set
			`)

			res.send({
				success: true,
				items: results.rows
			})

		} catch (error) {
			res.send({ success: false, error })
		}
	}

	async deletePresentation(req: Request, res: Response) {
		const { key } = req.params
		try {
			await this.database.query(`
				DELETE FROM slide_set WHERE name = $1::text
			`, [key])

			await this.database.query(`
				DELETE FROM slide_page WHERE slide_name = $1::text
			`, [key])

			res.send({ success: true })
		} catch (error) {
			res.send({ success: false, error })
		}
	}

	async page(req: Request, res: Response) {
		const { key, page: pageStr } = req.params
		const page = parseInt(pageStr)
		const pdfPath = resolvePath(tmpDir, key)

		try {
			try {
				const { rows: imageCache } = await this.database.query(`
					SELECT image_base64 FROM slide_page WHERE slide_name = $1::text AND number = $2
				`, [key, page])

				if (imageCache.length > 0) {
					console.log(`Using image from cache: ${key}:${page}`)

					const { image_base64: cacheBase64 } = imageCache[0]
					res.sendRaw(Buffer.from(cacheBase64, 'base64'))
					return 
				}
			} catch (e) {
				console.log(`Cache miss: ${key}:${page}`)
			}

			const inCache = await fs.stat(pdfPath).then(() => true).catch(() => false);
			if (!inCache) {
				console.log(`Download pdf file cache: ${key}`)

				const { rows: pdfEncoded } = await this.database.query(`
					SELECT pdf_base64 FROM slide_set WHERE name = $1::text
				`, [key])

				if (pdfEncoded.length === 0) throw new Error('invalid key')

				const { pdf_base64: cacheBase64 } = pdfEncoded[0]
				await fs.writeFile(pdfPath, Buffer.from(cacheBase64, 'base64'))
			}

			const converter = pdf.fromPath(pdfPath, convertSettings)
			const { base64: imageEncoded }: { base64?: string } = await converter(page, true);
			if(!imageEncoded) {
				res.send(404)
				return
			}

			await this.database.query(`
				INSERT INTO slide_page(slide_name, number, image_base64) VALUES($1::text, $2, $3::text)
			`, [key, page, imageEncoded])

			res.sendRaw(Buffer.from(imageEncoded, 'base64'))
		} catch (error) {
			console.error(error)
			res.send(404)
		}
	}
}
