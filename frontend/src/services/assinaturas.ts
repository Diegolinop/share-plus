export type CadastroAssinatura = {
  servico: string
  valorTotal: number
  periodicidade: 'MENSAL' | 'ANUAL'
  diaVencimento: number
  vagas: number
}

// POST /api/assinaturas: formato retornado pelo backend existente.
export type AssinaturaCriada = {
  id: number
  servico: string
  grupo: { id: number; status: string; administradorId: number }
}

export type CadastrarAssinatura = (dados: CadastroAssinatura) => Promise<AssinaturaCriada>
