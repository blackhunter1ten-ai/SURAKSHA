import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const count = await prisma.user.count();
    console.log("Database connection successful. User count:", count);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}
main();
