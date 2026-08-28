import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// vi.mock calls MUST appear before any imports that reference these modules (Vitest hoisting)
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { POST } from './route'
import { stripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const mockConstructEvent = vi.mocked(stripe.webhooks.constructEvent)
const mockFindUnique = vi.mocked(prisma.stripeEvent.findUnique)
const mockCreate = vi.mocked(prisma.stripeEvent.create)

const WEBHOOK_SECRET_BACKUP = process.env.STRIPE_WEBHOOK_SECRET

function makeEvent(id: string, type: string): Stripe.Event {
  return {
    id,
    type,
    data: { object: { id: 'obj_123' } },
  } as unknown as Stripe.Event
}

function makeRequest(body: string): Request {
  return new Request('https://marketplace.wwv.local:3002/api/billing/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't=1,v1=deadbeef', 'content-type': 'text/plain' },
    body,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  mockFindUnique.mockResolvedValue(null)
  mockCreate.mockResolvedValue({} as never)
})

afterAll(() => {
  if (WEBHOOK_SECRET_BACKUP === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET_BACKUP
  }
})

describe('POST /api/billing/webhook', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new Request('https://marketplace.wwv.local:3002/api/billing/webhook', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 400 when the signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature payload')
    })
    const res = await POST(makeRequest('{}'))
    expect(res.status).toBe(400)
    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('processes a valid event once and records it after handling', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('evt_001', 'invoice.paid'))
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'evt_001' } })
    expect(mockCreate).toHaveBeenCalledWith({ data: { id: 'evt_001', type: 'invoice.paid' } })
    // Side effect (handling log) ran before the record was written.
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it('skips a duplicate event.id without re-processing it', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('evt_001', 'invoice.paid'))
    mockFindUnique.mockResolvedValue({ id: 'evt_001', type: 'invoice.paid', createdAt: new Date() } as never)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'evt_001' } })
    expect(mockCreate).not.toHaveBeenCalled()
    // Side effect must not run for an already-processed event.
    expect(logSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it('does not record the event as processed when handling fails', async () => {
    const event = makeEvent('evt_002', 'customer.subscription.deleted')
    // Accessing .id inside the handler throws, simulating a handler failure.
    const poisoned: { data: { object: unknown } } = event
    poisoned.data.object = Object.defineProperty({}, 'id', {
      get() {
        throw new Error('handler exploded')
      },
    })
    mockConstructEvent.mockReturnValue(event)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest('{}'))

    // Handling failed: still 200 (no lost events) but no processed record,
    // so a Stripe retry re-runs the side effect.
    expect(res.status).toBe(200)
    expect(mockCreate).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('treats a concurrent duplicate insert (P2002) as already processed', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('evt_003', 'invoice.paid'))
    const conflict = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    mockCreate.mockRejectedValue(conflict)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    errSpy.mockRestore()
  })

  it('still returns 200 when the dedup lookup itself fails', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('evt_004', 'invoice.paid'))
    mockFindUnique.mockRejectedValue(new Error('DB unavailable'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    errSpy.mockRestore()
  })
})
