const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.plugin.findUnique({where: {id: 'military-bases'}}).then(console.log).finally(() => prisma.$disconnect());
