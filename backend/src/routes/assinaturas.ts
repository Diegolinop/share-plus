import { Router } from 'express'

import { cadastrarAssinatura } from '../controllers/assinaturas.js'

export const assinaturasRouter = Router()

assinaturasRouter.post('/', cadastrarAssinatura)
