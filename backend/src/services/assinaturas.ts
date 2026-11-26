import { prisma } from '../db/prisma.js'

type Cadastro = {
  servico: string
  valorTotal: number
  periodicidade: 'MENSAL' | 'ANUAL'
  diaVencimento: number
  vagas: number
}

export function criarAssinatura(administradorId: number, dados: Cadastro, chave?: string) {
  const dadosAssinatura = {
    servico: dados.servico,
    valor_total_centavos: Math.round(dados.valorTotal * 100),
    periodicidade: dados.periodicidade,
    dia_vencimento: dados.diaVencimento,
    vagas: dados.vagas,
  }

  return prisma.$transaction(async (tx) => {
    const administrador = await tx.usuario.findUnique({ where: { id: administradorId } })
    if (!administrador) return { tipo: 'nao_autenticado' } as const
    if (administrador.papel !== 'Administrador') return { tipo: 'sem_permissao' } as const

    const existente = chave === undefined ? null : await tx.grupo.findUnique({
      where: { administrador_id_chave_idempotencia: { administrador_id: administradorId, chave_idempotencia: chave } },
      include: { assinatura: true },
    })
    if (existente) {
      const { assinatura } = existente
      if (
        assinatura.servico !== dadosAssinatura.servico ||
        assinatura.valor_total_centavos !== dadosAssinatura.valor_total_centavos ||
        assinatura.periodicidade !== dadosAssinatura.periodicidade ||
        assinatura.dia_vencimento !== dadosAssinatura.dia_vencimento ||
        assinatura.vagas !== dadosAssinatura.vagas
      ) {
        return { tipo: 'chave_em_uso' } as const
      }
    }

    const grupo = existente ?? await tx.grupo.create({
      data: {
        status: 'ATIVO',
        chave_idempotencia: chave,
        assinatura: { create: dadosAssinatura },
        administrador: { connect: { id: administradorId } },
        participacoes: {
          create: { status: 'ATIVO', usuario: { connect: { id: administradorId } } },
        },
      },
      include: { assinatura: true },
    })

    return {
      tipo: 'criada',
      assinatura: {
        id: grupo.assinatura.id,
        servico: grupo.assinatura.servico,
        grupo: {
          id: grupo.id,
          status: grupo.status,
          administradorId: grupo.administrador_id,
        },
      },
    } as const
  })
}
