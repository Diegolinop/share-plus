import 'dotenv/config'
import { closeSync, mkdirSync, openSync } from 'node:fs'
import { dirname } from 'node:path'

const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
if (!url.startsWith('file:')) throw new Error('DATABASE_URL deve apontar para um arquivo SQLite.')

const path = url.slice(5).replace(/\?.*$/, '')
if (!path) throw new Error('DATABASE_URL não informa o arquivo SQLite.')
mkdirSync(dirname(path), { recursive: true })
closeSync(openSync(path, 'a'))
