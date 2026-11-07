// Creates (or updates the password of) the single app user.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' node --env-file=.env.local scripts/seed.mjs
//
// Password is bcrypt-hashed before it is stored; it is never written in plain text.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`User ready: ${user.email}`);
} finally {
  await prisma.$disconnect();
}
