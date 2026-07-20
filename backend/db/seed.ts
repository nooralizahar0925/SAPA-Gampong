import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

export async function seedAdmin() {
  const email = 'admin@gampongblang.id';
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Admin Gampong Blang',
      email,
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'admin',
    },
  });
  console.log(`Seeded admin: ${email} / admin123`);
}

if (require.main === module) {
  seedAdmin()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
