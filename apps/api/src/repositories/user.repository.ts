import { uuidv7 } from 'uuidv7'
import type { User } from '../generated/prisma'
import { BaseRepository } from './base.repository'

export class UserRepository extends BaseRepository {
  async findById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    })
  }

  /**
   * FOR AUTH SERVICE USE ONLY — returns the full User record including passwordHash.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async create(data: {
    email: string
    name: string
    passwordHash: string
    avatarUrl?: string
  }): Promise<Omit<User, 'passwordHash'>> {
    return this.prisma.user.create({
      data: { id: uuidv7(), ...data },
      omit: { passwordHash: true },
    })
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    return result !== null
  }
}

export const userRepository = new UserRepository()
