import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

import { PrismaClient } from '../src/generated/prisma/client.js'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const directory = mkdtempSync(join(tmpdir(), 'share-plus-persistence-'))
const url = `file:${join(directory, 'test.db')}`
const env = { ...process.env, DATABASE_URL: url }
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })

const assinatura = {
  servico: 'Serviço de teste',
  valor_total_centavos: 3999,
  periodicidade: 'Mensal',
  dia_vencimento: 10,
  vagas: 4,
}

function deploy() {
  execFileSync(process.execPath, ['--import', 'tsx', 'prisma/ensure-database.ts'], { cwd, env })
  return execFileSync(process.execPath, [
    'node_modules/prisma/build/index.js', 'migrate', 'deploy',
    '--config', 'prisma.config.ts',
  ], { cwd, env, encoding: 'utf8' })
}

async function criarGrupo() {
  return prisma.grupo.create({
    data: {
      status: 'Ativo',
      assinatura: { create: assinatura },
      administrador: {
        create: { nome: 'Administrador', email: 'gestor@example.test', papel: 'Administrador' },
      },
    },
  })
}

before(() => {
  deploy()
})

beforeEach(async () => {
  await prisma.participacao.deleteMany()
  await prisma.grupo.deleteMany()
  await prisma.assinatura.deleteMany()
  await prisma.usuario.deleteMany()
})

after(async () => {
  await prisma.$disconnect()
  rmSync(directory, { recursive: true, force: true })
})

test('aplica a migration em banco novo e permite reaplicação sem perda de dados', async () => {
  const usuario = await prisma.usuario.create({
    data: { nome: 'Teste', email: 'teste@example.test', papel: 'Membro' },
  })
  deploy()
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), usuario)
})

test('seed cria apenas um administrador e preserva registros existentes', async () => {
  const seed = () => execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], { cwd, env })
  seed()
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { email: 'admin@shareplus.test' } })
  assert.equal(admin.papel, 'Administrador')
  await prisma.usuario.update({ where: { id: admin.id }, data: { nome: 'Nome alterado' } })
  seed()
  assert.equal(await prisma.usuario.count(), 1)
  assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id: admin.id } })).nome, 'Nome alterado')
})

test('cria assinatura, grupo e participação do administrador atomicamente e consulta relações', async () => {
  const admin = await prisma.usuario.create({
    data: { nome: 'Administrador', email: 'admin@example.test', papel: 'Administrador' },
  })
  const criada = await prisma.assinatura.create({
    data: {
      ...assinatura,
      grupo: {
        create: {
          status: 'Ativo',
          administrador: { connect: { id: admin.id } },
          participacoes: { create: { status: 'Ativo', usuario: { connect: { id: admin.id } } } },
        },
      },
    },
  })
  const consultada = await prisma.assinatura.findUniqueOrThrow({
    where: { id: criada.id },
    include: { grupo: { include: { administrador: true, participacoes: { include: { usuario: true } } } } },
  })
  assert.equal(consultada.valor_total_centavos, 3999)
  assert.equal(consultada.grupo?.administrador.id, admin.id)
  assert.equal(consultada.grupo.participacoes.length, 1)
  assert.equal(consultada.grupo.participacoes[0]?.usuario.id, admin.id)

  await prisma.participacao.update({
    where: { grupo_id_usuario_id: { grupo_id: consultada.grupo.id, usuario_id: admin.id } },
    data: { status: 'Inativo' },
  })
  assert.equal((await prisma.participacao.findFirstOrThrow()).status, 'Inativo')
})

test('usuário administra vários grupos e participa de vários grupos', async () => {
  const primeiro = await criarGrupo()
  const segundo = await prisma.grupo.create({
    data: {
      status: 'Ativo', assinatura: { create: assinatura },
      administrador: { connect: { id: primeiro.administrador_id } },
    },
  })
  await prisma.participacao.createMany({
    data: [primeiro, segundo].map((grupo) => ({
      grupo_id: grupo.id, usuario_id: primeiro.administrador_id, status: 'Ativo',
    })),
  })
  const membro = await prisma.usuario.create({
    data: { nome: 'Membro', email: 'membro@example.test', papel: 'Membro' },
  })
  await prisma.participacao.create({
    data: { grupo_id: primeiro.id, usuario_id: membro.id, status: 'Ativo' },
  })
  const admin = await prisma.usuario.findUniqueOrThrow({
    where: { id: primeiro.administrador_id },
    include: { grupos_administrados: true, participacoes: true },
  })
  assert.equal(admin.grupos_administrados.length, 2)
  assert.equal(admin.participacoes.length, 2)
  assert.equal(await prisma.participacao.count({ where: { grupo_id: primeiro.id } }), 2)
})

test('rejeita e-mail duplicado, assinatura compartilhada entre grupos e participação duplicada', async () => {
  const grupo = await criarGrupo()
  await assert.rejects(prisma.usuario.create({
    data: { nome: 'Duplicado', email: 'gestor@example.test', papel: 'Membro' },
  }), { code: 'P2002' })
  await assert.rejects(prisma.grupo.create({
    data: { assinatura_id: grupo.assinatura_id, administrador_id: grupo.administrador_id, status: 'Ativo' },
  }), { code: 'P2002' })
  const data = { grupo_id: grupo.id, usuario_id: grupo.administrador_id, status: 'Ativo' }
  await prisma.participacao.create({ data })
  await assert.rejects(prisma.participacao.create({ data }), { code: 'P2002' })
})

test('rejeita chaves estrangeiras inexistentes em todas as relações', async () => {
  const grupo = await criarGrupo()
  await assert.rejects(prisma.grupo.create({
    data: { assinatura_id: -1, administrador_id: grupo.administrador_id, status: 'Ativo' },
  }), { code: 'P2003' })
  await assert.rejects(prisma.grupo.update({
    where: { id: grupo.id }, data: { administrador_id: -1 },
  }), { code: 'P2003' })
  await assert.rejects(prisma.participacao.create({
    data: { grupo_id: -1, usuario_id: grupo.administrador_id, status: 'Ativo' },
  }), { code: 'P2003' })
  await assert.rejects(prisma.participacao.create({
    data: { grupo_id: grupo.id, usuario_id: -1, status: 'Ativo' },
  }), { code: 'P2003' })
})

test('restringe exclusões de registros referenciados e permite exclusão em ordem', async () => {
  const grupo = await criarGrupo()
  await prisma.participacao.create({
    data: { grupo_id: grupo.id, usuario_id: grupo.administrador_id, status: 'Ativo' },
  })
  await assert.rejects(prisma.usuario.delete({ where: { id: grupo.administrador_id } }), { code: 'P2003' })
  await assert.rejects(prisma.assinatura.delete({ where: { id: grupo.assinatura_id } }), { code: 'P2003' })
  await assert.rejects(prisma.grupo.delete({ where: { id: grupo.id } }), { code: 'P2003' })
  await prisma.participacao.deleteMany()
  await prisma.grupo.delete({ where: { id: grupo.id } })
  await prisma.assinatura.delete({ where: { id: grupo.assinatura_id } })
  await prisma.usuario.delete({ where: { id: grupo.administrador_id } })
  assert.equal(await prisma.usuario.count(), 0)
})

test('desfaz a criação aninhada inteira se uma relação for inválida', async () => {
  await assert.rejects(prisma.assinatura.create({
    data: {
      ...assinatura,
      grupo: { create: { status: 'Ativo', administrador_id: -1 } },
    },
  }))
  assert.equal(await prisma.assinatura.count(), 0)
  assert.equal(await prisma.grupo.count(), 0)
})

test('CHECKs do SQLite rejeitam valores financeiros, vencimentos e vagas inválidos inclusive via SQL', async () => {
  for (const data of [
    { valor_total_centavos: 0 }, { valor_total_centavos: -1 },
    { dia_vencimento: 0 }, { dia_vencimento: 32 }, { vagas: 0 }, { vagas: -1 },
  ]) {
    await assert.rejects(prisma.assinatura.create({ data: { ...assinatura, ...data } }))
  }
  for (const valor of [1.5, 2147483648]) {
    await assert.rejects(prisma.$executeRaw`
      INSERT INTO "Assinatura" ("servico", "valor_total_centavos", "periodicidade", "dia_vencimento", "vagas")
      VALUES ('Teste', ${valor}, 'Mensal', 10, 4)
    `)
  }
  assert.equal(await prisma.assinatura.count(), 0)
})
