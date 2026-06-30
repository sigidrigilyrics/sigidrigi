import OpenAI from 'openai'
import ytdl from '@distube/ytdl-core'

export const maxDuration = 120

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { youtubeUrl, lyrics, introSeconds } = req.body
  if (!youtubeUrl || !lyrics) return res.status(400).json({ error: 'Missing youtubeUrl or lyrics' })

  try {
    // Download lowest quality audio from YouTube
    const stream = ytdl(youtubeUrl, { filter: 'audioonly', quality: 'lowestaudio' })
    const chunks = []
    await new Promise((resolve, reject) => {
      stream.on('data', c => chunks.push(c))
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    const audioBuffer = Buffer.concat(chunks)

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
        // fallback: distribute segment time across words
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
