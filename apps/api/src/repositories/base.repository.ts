import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

const prisma = new PrismaClient({
  adapter,
  log: [{ emit: 'event', level: 'query' }],
})

if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    if (e.duration >= 200) {
      console.warn(`Slow query (${e.duration}ms): ${e.query}`)
    }
  })
}

abstract class BaseRepository {
  protected readonly prisma: PrismaClient = prisma
}

export { prisma, BaseRepository }
