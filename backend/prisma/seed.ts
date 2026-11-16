import { prisma } from '../src/db/prisma.js'

try {
  // Não altera um usuário já existente nem duplica o administrador ao repetir o seed.
  await prisma.usuario.upsert({
    where: { email: 'admin@shareplus.test' },
    update: {},
    create: {
      nome: 'Administrador de teste',
      email: 'admin@shareplus.test',
      papel: 'Administrador',
    },
  })
} finally {
  await prisma.$disconnect()
}
