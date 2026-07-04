import { hashSync } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const username = process.env.ADMIN_USERNAME ?? 'admin';
const password = process.env.ADMIN_PASSWORD ?? 'trabajoya2024';
const email = process.env.ADMIN_EMAIL ?? 'admin@trabajoya.com';

await prisma.user.upsert({
  where: { username },
  create: {
    username,
    email,
    name: 'Administrador',
    passwordHash: hashSync(password, 10),
  },
  update: {},
});

console.log(`Usuario admin listo: ${username}`);

await prisma.$disconnect();
