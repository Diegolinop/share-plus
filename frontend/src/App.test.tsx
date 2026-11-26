import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

it.each(['/grupos', '/grupos/'])('abre Meus grupos em %s', async (rota) => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json([]))
  window.history.replaceState(null, '', rota)
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Meus grupos' })).toBeInTheDocument()
  expect(await screen.findByText('Você ainda não administra grupos.')).toBeInTheDocument()
})

it.each([null, '<!doctype html><h1>Bad Gateway</h1>'])('explica uma falha da API sem JSON', async (corpo) => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(corpo, { status: 502 }))
  window.history.replaceState(null, '', '/grupos')
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a solicitação.')
})
