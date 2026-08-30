import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findFirst({ where: { role: 'WORKER' } });
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'super-secret-key-1234567890', { expiresIn: '1h' });
  console.log(token);
}
run();
