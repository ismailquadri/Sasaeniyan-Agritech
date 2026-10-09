import { PrismaClient } from '@prisma/client'
import { seedDemo } from '../src/domain/seed/seed'

const db = new PrismaClient()

seedDemo(db)
  .then(() => console.log('Seeded demo cast: Mrs. Okafor, Ibrahim, Musa, Hauwa + glut market index.'))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
