import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.create({
    data: { name: 'Demo Retail Co' },
  });

  const passwordHash = await bcrypt.hash('Passw0rd!', 10);

  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'manager@demo.com',
      passwordHash,
      fullName: 'Demo Manager',
      role: 'MANAGER',
    },
  });

  const counter = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'counter@demo.com',
      passwordHash,
      fullName: 'Demo Counter',
      role: 'COUNTER',
    },
  });

  console.log('Seeded tenant:', tenant.id);
  console.log('Manager login: manager@demo.com / Passw0rd!');
  console.log('Counter login: counter@demo.com / Passw0rd!');
  console.log({ managerId: manager.id, counterId: counter.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
