import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { cadastrarAssinaturaSimulada } from '../services/assinaturas'
import type { AssinaturaCriada, CadastrarAssinatura, CadastroAssinatura } from '../services/assinaturas'

type Campos = Record<keyof CadastroAssinatura, string>
type Erros = Partial<Campos>
const inicial: Campos = { servico: '', valorTotal: '', periodicidade: '', diaVencimento: '', vagas: '' }
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function Campo({ nome, titulo, erro, children }: {
  nome: keyof Campos; titulo: string; erro?: string; children: ReactNode
}) {
  return <div>
    <label htmlFor={nome} className="mb-2 block text-sm font-semibold">{titulo} <span aria-hidden="true" className="text-violet-700">*</span></label>
    {children}
    {erro && <p id={`${nome}-erro`} className="mt-2 text-sm text-red-700">{erro}</p>}
  </div>
}

export default function CadastrarAssinaturaPage({ cadastrar = cadastrarAssinaturaSimulada }: { cadastrar?: CadastrarAssinatura }) {
  const [campos, setCampos] = useState<Campos>(inicial)
  const [erros, setErros] = useState<Erros>({})
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState('')
  const [sucesso, setSucesso] = useState<{ resposta: AssinaturaCriada; dados: CadastroAssinatura } | null>(null)
  const bloqueio = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)

  function props(nome: keyof Campos) {
    return {
      id: nome, name: nome, required: true, value: campos[nome],
      'aria-invalid': Boolean(erros[nome]),
      'aria-describedby': erros[nome] ? `${nome}-erro` : undefined,
      className: `w-full rounded-xl border bg-white px-4 py-3 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${erros[nome] ? 'border-red-600' : 'border-slate-300'}`,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCampos({ ...campos, [nome]: event.target.value })
        setErros({ ...erros, [nome]: undefined })
        setFalha('')
      },
    }
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (bloqueio.current) return
    const novos: Erros = {}
    for (const nome of Object.keys(campos) as (keyof Campos)[]) {
      if (!campos[nome].trim()) novos[nome] = 'Preencha este campo obrigatório.'
    }
    const valor = Number(campos.valorTotal.replace(',', '.'))
    const dia = Number(campos.diaVencimento)
    const vagas = Number(campos.vagas)
    if (campos.valorTotal && (!/^\d+([.,]\d{1,2})?$/.test(campos.valorTotal) || valor < 0.01 || valor > 21474836.47)) {
      novos.valorTotal = 'Informe um valor entre R$ 0,01 e R$ 21.474.836,47, com até duas casas decimais.'
    }
    if (campos.diaVencimento && (!Number.isInteger(dia) || dia < 1 || dia > 31)) novos.diaVencimento = 'Informe um dia inteiro entre 1 e 31.'
    if (campos.vagas && (!Number.isInteger(vagas) || vagas < 1 || vagas > 2147483647)) novos.vagas = 'Informe um número inteiro positivo, até 2.147.483.647.'
    if (campos.periodicidade && campos.periodicidade !== 'MENSAL' && campos.periodicidade !== 'ANUAL') novos.periodicidade = 'Selecione uma periodicidade válida.'
    setErros(novos)
    if (Object.keys(novos).length) {
      form.current?.querySelector<HTMLElement>(`[name="${Object.keys(novos)[0]}"]`)?.focus()
      return
    }
    const dados: CadastroAssinatura = {
      servico: campos.servico.trim(), valorTotal: valor,
      periodicidade: campos.periodicidade as CadastroAssinatura['periodicidade'], diaVencimento: dia, vagas,
    }
    bloqueio.current = true
    setEnviando(true)
    setFalha('')
    try {
      const resposta = await cadastrar(dados)
      setSucesso({ resposta, dados })
      requestAnimationFrame(() => titulo.current?.focus())
    } catch {
      setFalha('Não foi possível cadastrar a assinatura. Seus dados foram mantidos. Tente novamente.')
    } finally {
      bloqueio.current = false
      setEnviando(false)
    }
  }

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="text-2xl font-extrabold tracking-tight text-violet-800">share<span className="text-violet-500">+</span><span className="sr-only"> Share+</span></span>
        <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">Área do administrador</span>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="mb-3 text-sm font-semibold text-violet-700">ASSINATURAS COMPARTILHADAS</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cadastrar assinatura</h1>
      <p className="mt-3 max-w-xl text-slate-600">Compartilhe serviços, organize seu grupo e mantenha tudo em um só lugar.</p>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-label="Cadastro de assinatura">
          {sucesso ? <div>
            <div className="mb-5 inline-flex rounded-full bg-emerald-50 px-4 py-2 font-semibold text-emerald-800" role="status">Cadastro simulado concluído</div>
            <h2 ref={titulo} tabIndex={-1} className="text-2xl font-bold">Assinatura cadastrada com sucesso!</h2>
            <p className="mt-3 text-slate-600">{sucesso.resposta.servico} está pronta para compartilhar nesta demonstração.</p>
            <dl className="my-6 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-600">Valor total</dt><dd className="font-semibold">{moeda.format(sucesso.dados.valorTotal)}</dd></div>
              <div><dt className="text-sm text-slate-600">Periodicidade</dt><dd className="font-semibold">{sucesso.dados.periodicidade === 'MENSAL' ? 'Mensal' : 'Anual'}</dd></div>
              <div><dt className="text-sm text-slate-600">Vencimento</dt><dd className="font-semibold">Dia {sucesso.dados.diaVencimento}</dd></div>
              <div><dt className="text-sm text-slate-600">Vagas disponíveis</dt><dd className="font-semibold">{sucesso.dados.vagas}</dd></div>
            </dl>
            <button className="primary-button" onClick={() => { setSucesso(null); setCampos(inicial); setErros({}); requestAnimationFrame(() => form.current?.querySelector('input')?.focus()) }}>Cadastrar outra assinatura</button>
          </div> : <form ref={form} onSubmit={enviar} noValidate aria-busy={enviando}>
            <h2 className="text-xl font-bold">Dados da assinatura</h2>
            <p className="mb-7 mt-2 text-sm text-slate-600">Todos os campos são obrigatórios.</p>
            <fieldset disabled={enviando} className="space-y-6 disabled:opacity-65">
              <Campo nome="servico" titulo="Nome do serviço" erro={erros.servico}><input {...props('servico')} autoComplete="off" placeholder="Ex.: Spotify Premium" /></Campo>
              <div className="grid gap-6 sm:grid-cols-2">
                <Campo nome="valorTotal" titulo="Valor total da assinatura (R$)" erro={erros.valorTotal}><input {...props('valorTotal')} type="text" inputMode="decimal" placeholder="0,00" /></Campo>
                <Campo nome="periodicidade" titulo="Periodicidade" erro={erros.periodicidade}><select {...props('periodicidade')}><option value="">Selecione</option><option value="MENSAL">Mensal</option><option value="ANUAL">Anual</option></select></Campo>
                <Campo nome="diaVencimento" titulo="Dia de vencimento" erro={erros.diaVencimento}><input {...props('diaVencimento')} type="number" min="1" max="31" step="1" placeholder="De 1 a 31" /></Campo>
                <Campo nome="vagas" titulo="Número de vagas disponíveis" erro={erros.vagas}><input {...props('vagas')} type="number" min="1" max="2147483647" step="1" placeholder="Ex.: 4" /></Campo>
              </div>
            </fieldset>
            {falha && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{falha}</p>}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <button disabled={enviando} className="primary-button w-full sm:w-auto" type="submit">{enviando ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" /> Cadastrando…</> : 'Cadastrar assinatura'}</button>
              <p className="sr-only" role="status">{enviando ? 'Cadastro em andamento. Aguarde.' : ''}</p>
            </div>
          </form>}
        </section>
        <aside className="space-y-5">
          <div className="rounded-2xl bg-violet-100 p-6 text-violet-950">
            <h2 className="text-lg font-bold">O primeiro passo para compartilhar</h2>
            <p className="mt-3 text-sm leading-6">Informe o valor total do plano, a frequência de cobrança e quantas vagas estão disponíveis para os participantes.</p>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 p-6">
            <h2 className="font-semibold">Ambiente de demonstração</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">O envio é simulado. Nenhum dado é salvo ou enviado à API. A integração HTTP será realizada em uma próxima etapa.</p>
          </div>
        </aside>
      </div>
    </main>
  </div>
}
