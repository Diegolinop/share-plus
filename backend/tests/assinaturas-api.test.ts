import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import type { Server } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const directory = mkdtempSync(join(tmpdir(), 'share-plus-api-'))
const database = join(directory, 'test.db')
const originalUrl = process.env.DATABASE_URL
process.env.DATABASE_URL = `file:${database}`

let prisma: typeof import('../src/db/prisma.js').prisma
let server: Server
let baseUrl: string
let adminId: number
let membroId: number

const cadastro = {
  servico: 'Netflix',
  valorTotal: 59.90,
  periodicidade: 'MENSAL',
  diaVencimento: 15,
  vagas: 4,
}

async function post(body: unknown, usuarioId?: number) {
  return fetch(`${baseUrl}/api/assinaturas`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:5173',
      ...(usuarioId === undefined ? {} : { 'x-user-id': String(usuarioId) }),
    },
    body: JSON.stringify(body),
  })
}

before(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'prisma/ensure-database.ts'], { cwd, env: process.env })
  execFileSync(process.execPath, [
    'node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'prisma.config.ts',
  ], { cwd, env: process.env })

  ;({ prisma } = await import('../src/db/prisma.js'))
  const { app } = await import('../src/app.js')
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Servidor de teste não iniciou.')
  baseUrl = `http://127.0.0.1:${address.port}`
})

beforeEach(async () => {
  await prisma.participacao.deleteMany()
  await prisma.grupo.deleteMany()
  await prisma.assinatura.deleteMany()
  await prisma.usuario.deleteMany()

  const admin = await prisma.usuario.create({
    data: { nome: 'Administrador', email: 'admin@example.test', papel: 'Administrador' },
  })
  const membro = await prisma.usuario.create({
    data: { nome: 'Membro', email: 'membro@example.test', papel: 'Membro' },
  })
  adminId = admin.id
  membroId = membro.id
})

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  if (prisma) await prisma.$disconnect()
  rmSync(directory, { recursive: true, force: true })
  if (originalUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalUrl
})

test('cadastra assinatura, grupo ativo e administrador como primeiro participante', async () => {
  const response = await post(cadastro, adminId)
  assert.equal(response.status, 201)
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')

  const result = await response.json() as {
    id: number
    servico: string
    grupo: { id: number; status: string; administradorId: number }
  }
  assert.deepEqual(result, {
    id: result.id,
    servico: 'Netflix',
    grupo: { id: result.grupo.id, status: 'ATIVO', administradorId: adminId },
  })

  const assinatura = await prisma.assinatura.findUniqueOrThrow({
    where: { id: result.id },
    include: { grupo: { include: { participacoes: true } } },
  })
  assert.equal(assinatura.valor_total_centavos, 5990)
  assert.equal(assinatura.periodicidade, 'MENSAL')
  const grupo = assinatura.grupo
  assert.ok(grupo)
  const grupos = await fetch(baseUrl + '/api/grupos', { headers: { 'x-user-id': String(adminId) } })
  assert.equal(grupos.status, 200)
  assert.deepEqual(await grupos.json(), [{ id: grupo.id, status: 'ATIVO', assinatura: { servico: 'Netflix' } }])
  const outros = await fetch(baseUrl + '/api/grupos', { headers: { 'x-user-id': String(membroId) } })
  assert.deepEqual(await outros.json(), [])
  assert.equal((await fetch(baseUrl + '/api/grupos')).status, 401)
  assert.equal(grupo.id, result.grupo.id)
  assert.deepEqual(grupo.participacoes.map(({ usuario_id, status }) => ({ usuario_id, status })), [
    { usuario_id: adminId, status: 'ATIVO' },
  ])
})

test('rejeita campos obrigatórios e valores inválidos sem persistir dados', async () => {
  for (const invalidos of [
    { servico: '' }, { servico: undefined }, { valorTotal: undefined },
    { periodicidade: undefined }, { diaVencimento: undefined }, { vagas: undefined },
    { valorTotal: 0 }, { valorTotal: -1 }, { valorTotal: 59.999 },
    { valorTotal: 1e-9 }, { valorTotal: 0.001 },
    { periodicidade: 'SEMANAL' }, { diaVencimento: 0 }, { diaVencimento: 32 },
    { vagas: 0 }, { vagas: 1.5 },
  ]) {
    const response = await post({ ...cadastro, ...invalidos }, adminId)
    assert.equal(response.status, 400, JSON.stringify(invalidos))
    assert.equal(((await response.json()) as { error: string }).error, 'Dados inválidos.')
  }
  assert.equal(await prisma.assinatura.count(), 0)
  assert.equal(await prisma.grupo.count(), 0)
  assert.equal(await prisma.participacao.count(), 0)
})

test('distingue ausência de autenticação de falta de permissão', async () => {
  assert.equal((await post(cadastro)).status, 401)
  assert.equal((await post(cadastro, 999999)).status, 401)
  assert.equal((await post(cadastro, membroId)).status, 403)
  assert.equal(await prisma.assinatura.count(), 0)
})

test('aceita os limites mínimo e máximo do valor em centavos', async () => {
  for (const valorTotal of [0.01, 21474836.47]) {
    const response = await post({ ...cadastro, valorTotal }, adminId)
    assert.equal(response.status, 201)
    const result = await response.json() as { id: number }
    const assinatura = await prisma.assinatura.findUniqueOrThrow({ where: { id: result.id } })
    assert.equal(assinatura.valor_total_centavos, Math.round(valorTotal * 100))
  }
})

test('responde 400 para JSON malformado', async () => {
  const response = await fetch(`${baseUrl}/api/assinaturas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': String(adminId) },
    body: '{',
  })
  assert.equal(response.status, 400)
  assert.equal(((await response.json()) as { error: string }).error, 'JSON inválido.')
})

test('responde 413 para JSON acima do limite sem persistir dados', async () => {
  const response = await post({ ...cadastro, servico: 'x'.repeat(103000) }, adminId)
  assert.equal(response.status, 413)
  assert.equal(((await response.json()) as { error: string }).error, 'Corpo da requisição excede o limite de 100 KB.')
  assert.equal(await prisma.assinatura.count(), 0)
  assert.equal(await prisma.grupo.count(), 0)
  assert.equal(await prisma.participacao.count(), 0)
})

test('responde ao preflight CORS da origem configurada', async () => {
  const response = await fetch(`${baseUrl}/api/assinaturas`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,x-user-id',
    },
  })
  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  assert.match(response.headers.get('access-control-allow-headers') ?? '', /x-user-id/i)
})

test('desfaz assinatura e grupo quando a participação falha', async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER falha_participacao BEFORE INSERT ON "Participacao"
    BEGIN SELECT RAISE(ABORT, 'Falha de teste'); END
  `)
  try {
    const response = await post(cadastro, adminId)
    assert.equal(response.status, 500)
    assert.equal(((await response.json()) as { error: string }).error, 'Erro interno do servidor.')
    assert.equal(await prisma.assinatura.count(), 0)
    assert.equal(await prisma.grupo.count(), 0)
    assert.equal(await prisma.participacao.count(), 0)
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER falha_participacao')
  }
})
