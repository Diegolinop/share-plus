import { useEffect, useState } from 'react'
import { listarGrupos, type Grupo } from '../services/assinaturaService'

export default function Grupos() {
  const [grupos, setGrupos] = useState<Grupo[]>()
  const [erro, setErro] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    listarGrupos(controller.signal).then(setGrupos).catch((falha: unknown) => {
      if (!controller.signal.aborted) setErro(falha instanceof Error ? falha.message : 'Falha ao carregar os grupos.')
    })
    return () => controller.abort()
  }, [])

  return <main className="mx-auto max-w-6xl px-5 py-10">
    <h1 className="mb-6 text-3xl font-bold">Meus grupos</h1>
    {erro ? <p role="alert">{erro}</p> : !grupos ? <p role="status">Carregando grupos…</p>
      : grupos.length === 0 ? <p>Você ainda não administra grupos.</p>
      : <ul className="grid gap-4 sm:grid-cols-2">{grupos.map(grupo =>
        <li key={grupo.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">{grupo.assinatura.servico}</h2>
          <p>Grupo #{grupo.id} · {grupo.status}</p>
        </li>)}</ul>}
  </main>
}
