import OpenAI from 'openai'
import { Innertube } from 'youtubei.js'

export const maxDuration = 120

function extractVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|\/v\/|\/embed\/)([^&?#/\s]{11})/)
  return m ? m[1] : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { youtubeUrl, lyrics } = req.body
  if (!youtubeUrl || !lyrics) return res.status(400).json({ error: 'Missing youtubeUrl or lyrics' })

  const videoId = extractVideoId(youtubeUrl)
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' })

  try {
    // Use InnerTube IOS client — not blocked by bot detection
    const yt = await Innertube.create({ generate_session_locally: true })
    const info = await yt.getBasicInfo(videoId, 'IOS')
    const format = info.chooseFormat({ type: 'audio', quality: 'bestefficiency' })
    if (!format?.url) throw new Error('No audio format found for this video')

    const audioRes = await fetch(format.url)
    if (!audioRes.ok) throw new Error(`Audio download failed: ${audioRes.status}`)
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

    // Send to OpenAI Whisper with word-level timestamps
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const audioFile = new File([audioBuffer], 'audio.mp4', { type: 'audio/mp4' })

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
