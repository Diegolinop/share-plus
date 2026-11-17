import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CadastrarAssinatura from './CadastrarAssinatura'
import type { AssinaturaCriada } from '../services/assinaturas'

const resposta: AssinaturaCriada = { id: 8, servico: 'Spotify', grupo: { id: 9, status: 'ATIVO', administradorId: 1 } }

function preencher(valor = '39,90', dia = '10', vagas = '4') {
  fireEvent.change(screen.getByLabelText(/Nome do serviço/), { target: { value: '  Spotify  ' } })
  fireEvent.change(screen.getByLabelText(/Valor total/), { target: { value: valor } })
  fireEvent.change(screen.getByLabelText(/Periodicidade/), { target: { value: 'MENSAL' } })
  fireEvent.change(screen.getByLabelText(/Dia de vencimento/), { target: { value: dia } })
  fireEvent.change(screen.getByLabelText(/Número de vagas/), { target: { value: vagas } })
}

function enviar() { fireEvent.click(screen.getByRole('button', { name: 'Cadastrar assinatura' })) }

describe('UC-001', () => {
  it('informa os cinco campos obrigatórios e foca o primeiro inválido', () => {
    const cadastrar = vi.fn()
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    enviar()
    expect(screen.getAllByText('Preencha este campo obrigatório.')).toHaveLength(5)
    expect(screen.getByLabelText(/Nome do serviço/)).toHaveFocus()
    expect(screen.getByLabelText(/Nome do serviço/)).toHaveAccessibleDescription('Preencha este campo obrigatório.')
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it.each(['0', '-1', '0,001', '1.234', '21474836,48', 'Infinity', '1e3', '   '])('rejeita valor total %s', (valor) => {
    const cadastrar = vi.fn()
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    preencher(valor)
    enviar()
    expect(screen.getByLabelText(/Valor total/)).toHaveAttribute('aria-invalid', 'true')
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it.each(['0', '32', '1.5', '-1'])('rejeita vencimento %s', (dia) => {
    const cadastrar = vi.fn()
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    preencher('39,90', dia)
    enviar()
    expect(screen.getByText('Informe um dia inteiro entre 1 e 31.')).toBeInTheDocument()
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it.each(['0', '-1', '1.5', '2147483648'])('rejeita vagas %s', (vagas) => {
    const cadastrar = vi.fn()
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    preencher('39,90', '10', vagas)
    enviar()
    expect(screen.getByText(/Informe um número inteiro positivo/)).toBeInTheDocument()
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('rejeita nome contendo somente espaços', () => {
    const cadastrar = vi.fn()
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    preencher()
    fireEvent.change(screen.getByLabelText(/Nome do serviço/), { target: { value: '   ' } })
    enviar()
    expect(screen.getByLabelText(/Nome do serviço/)).toHaveAttribute('aria-invalid', 'true')
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('envia o contrato, bloqueia duplicidade e confirma com opção de reiniciar', async () => {
    let concluir!: (value: AssinaturaCriada) => void
    const cadastrar = vi.fn(() => new Promise<AssinaturaCriada>((resolve) => { concluir = resolve }))
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    preencher()
    enviar()
    expect(screen.getByRole('button', { name: /Cadastrando/ })).toBeDisabled()
    expect(screen.getByLabelText(/Nome do serviço/)).toBeDisabled()
    fireEvent.submit(screen.getByRole('button', { name: /Cadastrando/ }).closest('form')!)
    expect(cadastrar).toHaveBeenCalledTimes(1)
    expect(cadastrar).toHaveBeenCalledWith({ servico: 'Spotify', valorTotal: 39.9, periodicidade: 'MENSAL', diaVencimento: 10, vagas: 4 })
    await act(async () => concluir(resposta))
    expect(screen.getByRole('heading', { name: 'Assinatura cadastrada com sucesso!' })).toBeInTheDocument()
    expect(screen.getByText('R$ 39,90')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar outra assinatura' }))
    expect(screen.getByLabelText(/Nome do serviço/)).toHaveValue('')
    expect(screen.getByLabelText(/Periodicidade/)).toHaveValue('')
  })

  it.each([['0.01', '1'], ['21474836,47', '31']])('aceita limites de valor %s e dia %s com periodicidade anual', async (valor, dia) => {
    const cadastrar = vi.fn().mockResolvedValue(resposta)
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    preencher(valor, dia, '2147483647')
    fireEvent.change(screen.getByLabelText(/Periodicidade/), { target: { value: 'ANUAL' } })
    enviar()
    await screen.findByText('Assinatura cadastrada com sucesso!')
    expect(cadastrar).toHaveBeenCalledWith(expect.objectContaining({ periodicidade: 'ANUAL', diaVencimento: Number(dia), vagas: 2147483647 }))
  })

  it('mantém dados e permite tentar novamente após falha', async () => {
    const cadastrar = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(resposta)
    render(<CadastrarAssinatura cadastrar={cadastrar} />)
    preencher()
    enviar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Seus dados foram mantidos')
    expect(screen.getByLabelText(/Valor total/)).toHaveValue('39,90')
    enviar()
    await screen.findByText('Assinatura cadastrada com sucesso!')
    expect(cadastrar).toHaveBeenCalledTimes(2)
  })

  it('envia JSON com a identidade configurada e apresenta a recusa do backend', async () => {
    vi.stubEnv('VITE_USER_ID', '7')
    vi.stubEnv('VITE_API_URL', 'http://localhost:3001/')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: 'Apenas administradores podem cadastrar assinaturas.' }, { status: 403 }),
    )
    try {
      render(<CadastrarAssinatura />)
      preencher()
      enviar()
      expect(await screen.findByRole('alert')).toHaveTextContent('Apenas administradores podem cadastrar assinaturas.')
      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:3001/api/assinaturas', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': '7' },
        body: JSON.stringify({ servico: 'Spotify', valorTotal: 39.9, periodicidade: 'MENSAL', diaVencimento: 10, vagas: 4 }),
      })
    } finally {
      fetchSpy.mockRestore()
      vi.unstubAllEnvs()
    }
  })
})
