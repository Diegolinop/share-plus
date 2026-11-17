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

// Substituir este adaptador na issue de integração HTTP; não persiste dados.
export const cadastrarAssinaturaSimulada: CadastrarAssinatura = async (dados) => {
  await new Promise((resolve) => setTimeout(resolve, 800))
  return {
    id: 1,
    servico: dados.servico,
    grupo: { id: 1, status: 'ATIVO', administradorId: 1 },
  }
}
