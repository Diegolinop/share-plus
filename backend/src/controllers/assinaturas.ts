import type { Request, Response } from 'express'
import { z } from 'zod'

import { criarAssinatura } from '../services/assinaturas.js'

const cadastroSchema = z.strictObject({
  servico: z.string().trim().min(1),
  valorTotal: z.number().finite().min(0.01).max(21474836.47).refine(
    (valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 0.000001,
    'Informe no máximo duas casas decimais.',
  ),
  periodicidade: z.enum(['MENSAL', 'ANUAL']),
  diaVencimento: z.number().int().min(1).max(31),
  vagas: z.number().int().positive().max(2147483647),
})

export async function cadastrarAssinatura(req: Request, res: Response) {
  const id = Number(req.header('x-user-id'))
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(401).json({ error: 'Usuário não autenticado.' })
    return
  }

  const dados = cadastroSchema.safeParse(req.body)
  if (!dados.success) {
    res.status(400).json({ error: 'Dados inválidos.', detalhes: z.flattenError(dados.error).fieldErrors })
    return
  }

  const resultado = await criarAssinatura(id, dados.data)
  if (resultado.tipo === 'nao_autenticado') {
    res.status(401).json({ error: 'Usuário não autenticado.' })
    return
  }
  if (resultado.tipo === 'sem_permissao') {
    res.status(403).json({ error: 'Apenas administradores podem cadastrar assinaturas.' })
    return
  }

  res.status(201).json(resultado.assinatura)
}
