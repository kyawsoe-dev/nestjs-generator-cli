import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await argon2.hash("Asdfasdf@123");

  const existing = await prisma.user.findUnique({
    where: { userId: "USER_20250815001" },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        userId: "USER_20250815001",
        name: "Kyaw Soe",
        email: "kyawsoe@gmail.com",
        password: hashedPassword,
      },
    });
  }

  console.log("Seeded Successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
