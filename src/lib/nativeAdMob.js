import { Capacitor, registerPlugin } from '@capacitor/core'
import { configureRewardedAdProvider } from './adUnlock'

// registerPlugin keeps the web bundle usable before the native AdMob package is
// installed. The native bridge is discovered only on Android/iOS at runtime.
const AdMob = registerPlugin('AdMob')
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917'

export function configureNativeRewardedAds() {
  if (!Capacitor.isNativePlatform()) return false
  const adId = import.meta.env.VITE_ADMOB_REWARDED_ID || TEST_REWARDED_ID
  configureRewardedAdProvider(async () => {
    await AdMob.initialize()
    await AdMob.prepareRewardVideoAd({
      adId,
      isTesting: !import.meta.env.VITE_ADMOB_REWARDED_ID,
    })
    const reward = await AdMob.showRewardVideoAd()
    return Number(reward?.amount || 0) > 0
  })
  return true
}
