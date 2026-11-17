import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'

import { assinaturasRouter } from './routes/assinaturas.js'

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '100kb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/assinaturas', assinaturasRouter)

const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'JSON inválido.' })
    return
  }
  if (error instanceof Error && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Corpo da requisição excede o limite de 100 KB.' })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Erro interno do servidor.' })
}

app.use(handleError)
