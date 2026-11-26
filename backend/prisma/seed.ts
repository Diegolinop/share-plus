import { prisma } from '../src/db/prisma.js'

try {
  // Não altera um usuário já existente nem duplica o administrador ao repetir o seed.
  const usuario = await prisma.usuario.upsert({
    where: { email: 'admin@shareplus.test' },
    update: {},
    create: {
      nome: 'Administrador de teste',
      email: 'admin@shareplus.test',
      papel: 'Administrador',
    },
  })
  console.log(`Para o frontend local, configure VITE_USER_ID=${usuario.id}`)
} finally {
  await prisma.$disconnect()
}
