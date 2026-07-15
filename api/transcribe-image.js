import OpenAI from 'openai'

export const maxDuration = 30

export default async function handler(req, res) {
  // Allow the native app (served from https://localhost) to call this cross-origin.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, mimeType } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'This is a page from a Fijian songbook. Transcribe all song lyrics exactly as written, one line per line. Include only lyrics — no verse/chorus labels, no page numbers, no extra text.'
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
            detail: 'high'
          }
        }
      ]
    }],
    max_tokens: 2000
  })

  res.json({ lyrics: response.choices[0].message.content.trim() })
}
