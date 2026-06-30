import OpenAI from 'openai'
import { Innertube } from 'youtubei.js'

export const maxDuration = 120
export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }

function extractVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|\/v\/|\/embed\/)([^&?#/\s]{11})/)
  return m ? m[1] : null
}

async function downloadFromYoutube(videoId) {
  const yt = await Innertube.create()
  // Try multiple clients in order — IOS/ANDROID usually give direct URLs
  const clients = ['IOS', 'ANDROID', 'TV_EMBEDDED', 'WEB_EMBEDDED_PLAYER']
  for (const client of clients) {
    try {
      const info = await yt.getBasicInfo(videoId, client)
      const format = info.chooseFormat({ type: 'audio', quality: 'bestefficiency' })
      if (!format?.url) continue
      const resp = await fetch(format.url)
      if (!resp.ok) continue
      return { buffer: Buffer.from(await resp.arrayBuffer()), mimeType: 'audio/mp4' }
    } catch {
      continue
    }
  }
  throw new Error('Could not download audio from YouTube — try uploading an audio file instead')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { youtubeUrl, audioBase64, audioMimeType, lyrics } = req.body
  if (!lyrics) return res.status(400).json({ error: 'Missing lyrics' })
  if (!youtubeUrl && !audioBase64) return res.status(400).json({ error: 'Provide a YouTube URL or audio file' })

  try {
    let audioBuffer, mimeType

    if (audioBase64) {
      // Direct audio upload path — most reliable
      audioBuffer = Buffer.from(audioBase64, 'base64')
      mimeType = audioMimeType || 'audio/mpeg'
    } else {
      const videoId = extractVideoId(youtubeUrl)
      if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' })
      ;({ buffer: audioBuffer, mimeType } = await downloadFromYoutube(videoId))
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const ext = mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3' : 'mp4'
    const audioFile = new File([audioBuffer], `audio.${ext}`, { type: mimeType })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    })

    // Extract all words with timing
    const allWords = []
    for (const seg of transcription.segments || []) {
      if (seg.words?.length) {
        allWords.push(...seg.words)
      } else {
        const words = (seg.text || '').trim().split(/\s+/).filter(Boolean)
        const dur = (seg.end - seg.start) / (words.length || 1)
        words.forEach((w, i) => allWords.push({
          word: w, start: seg.start + i * dur, end: seg.start + (i + 1) * dur
        }))
      }
    }

    // Match words sequentially to lyric lines
    const lyricLines = lyrics.trim().split('\n').filter(l => l.trim())
    const timing = []
    let wordIdx = 0

    for (const line of lyricLines) {
      const lineWords = line.trim().split(/\s+/).filter(Boolean)
      const timedWords = lineWords.map(word => {
        const w = allWords[wordIdx] || allWords[allWords.length - 1] || {}
        wordIdx++
        return {
          text: word,
          start_time: w.start ?? w.start_time ?? 0,
          end_time: w.end ?? w.end_time ?? 0
        }
      })
      if (timedWords.length > 0) {
        timing.push({
          line: line.trim(),
          start_time: timedWords[0].start_time,
          end_time: timedWords[timedWords.length - 1].end_time,
          words: timedWords
        })
      }
    }

    res.json({ timing })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Failed to generate timing' })
  }
}
