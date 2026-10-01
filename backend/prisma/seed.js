const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = [
    { id_user: 'ADMIN', nama: 'Admin Sistem', username: 'admin', password: 'admin123', role: 'ADMIN' },
    { id_user: 'PEMILIK', nama: 'Pemilik', username: 'pemilik', password: 'pemilik123', role: 'PEMILIK' },
    { id_user: 'PRODUKSI', nama: 'Pengelola Produksi', username: 'produksi', password: 'produksi123', role: 'PENGELOLA_PRODUKSI' }
  ];

  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        id_user: user.id_user,
        nama: user.nama,
        password: hashed,
        role: user.role
      },
      create: {
        id_user: user.id_user,
        nama: user.nama,
        username: user.username,
        password: hashed,
        role: user.role
      }
    });
  }

  console.log('Seed users completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
