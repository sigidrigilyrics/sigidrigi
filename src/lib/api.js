import { Capacitor } from '@capacitor/core'

// The /api/* serverless routes only exist on the Vercel deployment. In the native
// app the web is served from https://localhost (no serverless functions there), so
// relative "/api/..." fetches 404. Prefix with the production origin when native.
const PROD_ORIGIN = 'https://sigidrigi.vercel.app'

export function apiUrl(path) {
  return (Capacitor.isNativePlatform() ? PROD_ORIGIN : '') + path
}
