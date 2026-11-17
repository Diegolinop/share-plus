import type { CadastrarAssinatura } from './assinaturas'

export type Grupo = { id: number; status: string; assinatura: { servico: string } }

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const resposta = await fetch(base + caminho, {
    ...opcoes,
    headers: {
      'x-user-id': import.meta.env.VITE_USER_ID ?? '',
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const corpo = await resposta.json()
  if (!resposta.ok) throw new Error(typeof corpo?.error === 'string' ? corpo.error : 'A API recusou a solicitação.')
  return corpo as T
}

export const cadastrarAssinatura: CadastrarAssinatura = (dados) =>
  requisitar('/api/assinaturas', { method: 'POST', body: JSON.stringify(dados) })

export const listarGrupos = (signal: AbortSignal) => requisitar<Grupo[]>('/api/grupos', { signal })
