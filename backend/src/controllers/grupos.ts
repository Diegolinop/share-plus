import type { Request, Response } from 'express'
import { prisma } from '../db/prisma.js'

export async function listarGrupos(req: Request, res: Response) {
  const id = Number(req.header('x-user-id'))
  const usuario = Number.isSafeInteger(id) && id > 0 && id <= 2147483647
    ? await prisma.usuario.findUnique({
        where: { id },
        select: {
          grupos_administrados: {
            orderBy: { id: 'desc' },
            select: { id: true, status: true, assinatura: { select: { servico: true } } },
          },
        },
      })
    : null
  if (!usuario) {
    res.status(401).json({ error: 'Usuário não autenticado.' })
    return
  }
  res.json(usuario.grupos_administrados)
}
