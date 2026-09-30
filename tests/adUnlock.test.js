import test from 'node:test'
import assert from 'node:assert/strict'
import { AD_UNLOCK_LIMIT, configureRewardedAdProvider, watchRewardedAd, grantAdUnlock } from '../src/lib/adUnlock.js'

test('rewarded provider stays unavailable until a native provider is registered', async () => {
  configureRewardedAdProvider(null)
  await assert.rejects(watchRewardedAd, /not connected/)
})

test('registered provider result is passed through without granting client-side entitlement', async () => {
  configureRewardedAdProvider(async () => true)
  assert.equal(await watchRewardedAd(), true)
  configureRewardedAdProvider(async () => false)
  assert.equal(await watchRewardedAd(), false)
  assert.equal(AD_UNLOCK_LIMIT, 3)
  assert.equal(grantAdUnlock('test-song'), true)
})
