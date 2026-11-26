import type { AssinaturaCriada, CadastrarAssinatura } from './assinaturas'

export type Grupo = { id: number; status: string; assinatura: { servico: string } }

const chavesPendentes = new Map<string, string>()

function origemApi() {
  return (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function lerChavePendente(registro: string) {
  try {
    return chavesPendentes.get(registro) ?? sessionStorage.getItem(registro)
  } catch {
    return chavesPendentes.get(registro)
  }
}

function salvarChavePendente(registro: string, chave: string | null) {
  if (chave === null) chavesPendentes.delete(registro)
  else chavesPendentes.set(registro, chave)

  try {
    if (chave === null) sessionStorage.removeItem(registro)
    else sessionStorage.setItem(registro, chave)
  } catch {
    // A chave ainda pode ser reutilizada nesta página se o armazenamento estiver indisponível.
  }
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const headers = new Headers(opcoes.headers)
  headers.set('x-user-id', import.meta.env.VITE_USER_ID ?? '')
  if (opcoes.body) headers.set('Content-Type', 'application/json')

  const resposta = await fetch(origemApi() + caminho, {
    ...opcoes,
    headers,
  }).catch((erro: unknown) => {
    if (opcoes.signal?.aborted) throw erro
    throw new Error('Não foi possível conectar à API.')
  })
  const corpo: unknown = await resposta.json().catch(() => undefined)
  if (!resposta.ok) {
    const mensagem = corpo && typeof corpo === 'object' && 'error' in corpo ? corpo.error : undefined
    throw new Error(typeof mensagem === 'string' && mensagem.trim() ? mensagem : 'Não foi possível concluir a solicitação.')
  }
  if (corpo === undefined) throw new Error('A API retornou uma resposta inválida.')
  return corpo as T
}

export const cadastrarAssinatura: CadastrarAssinatura = async (dados) => {
  const body = JSON.stringify(dados)
  const registro = 'share-plus:cadastro:' + JSON.stringify([origemApi(), import.meta.env.VITE_USER_ID, body])
  const chave = lerChavePendente(registro) ?? crypto.randomUUID()
  salvarChavePendente(registro, chave)

  const resultado = await requisitar<AssinaturaCriada>('/api/assinaturas', {
    method: 'POST', body, headers: { 'Idempotency-Key': chave },
  })
  if (!Number.isSafeInteger(resultado?.id) || !Number.isSafeInteger(resultado?.grupo?.id)) {
    throw new Error('A API retornou uma resposta inválida.')
  }
  if (lerChavePendente(registro) === chave) salvarChavePendente(registro, null)
  return resultado
}

export const listarGrupos = (signal: AbortSignal) => requisitar<Grupo[]>('/api/grupos', { signal })
