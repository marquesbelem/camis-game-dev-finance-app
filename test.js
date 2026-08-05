const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const slips = await prisma.paymentSlip.findMany({ where: { title: { contains: 'Banco Rico' } } });
  console.log(slips.map(s => Buffer.from(s.title).toString('hex')));
}
run();
