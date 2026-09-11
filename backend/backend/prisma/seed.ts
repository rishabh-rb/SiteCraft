import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "demo@sitecraft.local" },
    update: {},
    create: { name: "Demo Creator", email: "demo@sitecraft.local" },
  });
}

main().finally(() => prisma.$disconnect());
