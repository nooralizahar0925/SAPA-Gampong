import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

const DEV_DEFAULT_EMAIL = 'admin@gampongblang.id';
const DEV_DEFAULT_PASSWORD = 'admin123';

function resolveAdminCredentials(): { email: string; password: string } {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (process.env.NODE_ENV === 'production') {
    if (!email || !password) {
      throw new Error(
        'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set when NODE_ENV=production. ' +
          'Refusing to seed a known default admin password in production.',
      );
    }
    return { email, password };
  }

  return { email: email ?? DEV_DEFAULT_EMAIL, password: password ?? DEV_DEFAULT_PASSWORD };
}

export async function seedAdmin() {
  const { email, password } = resolveAdminCredentials();
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Admin Gampong Blang',
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'admin',
    },
  });
  console.log(`Seeded admin: ${email} / ${password}`);
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
