import { prisma } from '../db/prisma.js'

type Cadastro = {
  servico: string
  valorTotal: number
  periodicidade: 'MENSAL' | 'ANUAL'
  diaVencimento: number
  vagas: number
}

export function criarAssinatura(administradorId: number, dados: Cadastro) {
  return prisma.$transaction(async (tx) => {
    const administrador = await tx.usuario.findUnique({ where: { id: administradorId } })
    if (!administrador) return { tipo: 'nao_autenticado' } as const
    if (administrador.papel !== 'Administrador') return { tipo: 'sem_permissao' } as const

    const assinatura = await tx.assinatura.create({
      data: {
        servico: dados.servico,
        valor_total_centavos: Math.round(dados.valorTotal * 100),
        periodicidade: dados.periodicidade,
        dia_vencimento: dados.diaVencimento,
        vagas: dados.vagas,
        grupo: {
          create: {
            status: 'ATIVO',
            administrador: { connect: { id: administradorId } },
            participacoes: {
              create: { status: 'ATIVO', usuario: { connect: { id: administradorId } } },
            },
          },
        },
      },
      include: { grupo: true },
    })

    return {
      tipo: 'criada',
      assinatura: {
        id: assinatura.id,
        servico: assinatura.servico,
        grupo: {
          id: assinatura.grupo!.id,
          status: assinatura.grupo!.status,
          administradorId: assinatura.grupo!.administrador_id,
        },
      },
    } as const
  })
}
