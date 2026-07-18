import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Seeding database...');
    console.log('Done.');
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map