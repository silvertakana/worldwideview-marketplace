import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { hashApiKey } from './apiKeyHash'

const API_KEY_PREFIX = 'mk_'

export async function issueApiKey(opts: {
  userId: string
  name?: string
  deviceId?: string
}) {
  const raw = API_KEY_PREFIX + randomBytes(32).toString('base64url')
  const keyHash = hashApiKey(raw)
  const keyPrefix = raw.length > 10 ? raw.slice(0, 10) : raw
  await prisma.marketplaceApiKey.create({
    data: {
      userId: opts.userId,
      keyHash,
      keyPrefix,
      name: opts.name ?? null,
      deviceId: opts.deviceId ?? null,
    },
  })
  return { apiKey: raw } // plaintext returned ONCE; never stored
}
