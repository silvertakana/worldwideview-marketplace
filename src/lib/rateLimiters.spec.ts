import { describe, it, expect } from 'vitest'
import {
  connectDirectLimiter,
  pluginSubmitLimiter,
  checkoutLimiter,
  installStartLimiter,
  adminLimiter,
  instancesLinkLimiter,
} from './rateLimiters'

/**
 * Exhaust a limiter's per-window budget on a unique key, then assert the
 * next request is blocked with a 429 + Retry-After. Unique keys per test
 * keep singleton state isolated between cases.
 */
function expectBlocksAtLimitPlusOne(
  limiter: { check: (key: string) => Response | null },
  maxRequests: number,
  key: string,
) {
  for (let i = 0; i < maxRequests; i++) {
    expect(limiter.check(key)).toBeNull()
  }
  const blocked = limiter.check(key)
  expect(blocked).not.toBeNull()
  expect(blocked!.status).toBe(429)
  expect(blocked!.headers.get('Retry-After')).toBeTruthy()
}

describe('rateLimiters', () => {
  it('connectDirectLimiter blocks at 61 requests/min (60 limit)', () => {
    expectBlocksAtLimitPlusOne(connectDirectLimiter, 60, 'test:connect-direct')
  })

  it('pluginSubmitLimiter blocks at 11 requests/min (10 limit)', () => {
    expectBlocksAtLimitPlusOne(pluginSubmitLimiter, 10, 'test:plugin-submit')
  })

  it('checkoutLimiter blocks at 11 requests/min per user (10 limit)', () => {
    expectBlocksAtLimitPlusOne(checkoutLimiter, 10, 'test:checkout-user')
  })

  it('installStartLimiter blocks at 61 requests/min (60 limit)', () => {
    expectBlocksAtLimitPlusOne(installStartLimiter, 60, 'test:install-start')
  })

  it('adminLimiter blocks at 11 requests/min per IP (10 limit)', () => {
    expectBlocksAtLimitPlusOne(adminLimiter, 10, 'test:admin-ip')
  })

  it('instancesLinkLimiter blocks at 31 requests/min (30 limit)', () => {
    expectBlocksAtLimitPlusOne(instancesLinkLimiter, 30, 'test:instances-link')
  })
})
