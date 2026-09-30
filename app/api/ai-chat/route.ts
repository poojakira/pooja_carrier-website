import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, publicErrorStatus, readJsonBody, requireSession } from '@/lib/security'

const SYSTEM_PROMPT = `You are Pooja Kiran Bharadwaj's personal career assistant.

Use only the candidate facts supplied by this application. Never invent employers,
years of experience, certifications, metrics, production deployments, security
findings, or technologies. Treat generated application material as a draft that
requires the user's review before it is sent anywhere.

Candidate context:
- M.S. IT at ASU (Aug 2024 - May 2026)
- B.Tech CS from M.S. Ramaiah University (2019-2023)
- Independent AI Security Researcher since Aug 2024
- Open-source work across MCP security, AWS IAM analysis, model provenance,
  LLM security evaluation, adversarial ML, privacy attacks, and dataset poisoning
- Published IEEE INDICON 2023 paper on RL-based e-learning
- Skills include Python, FastAPI, PyTorch, scikit-learn, AWS IAM, Docker,
  GitHub Actions, and TypeScript
- F-1 OPT, open to relocation, Greater Phoenix AZ

Help with cover letters, interview preparation, project explanations, resume
wording, and job-search planning. Be concise and preserve evidence boundaries.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function validateMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw Object.assign(new Error('messages must contain 1-20 items'), { status: 422 })
  }

  let totalChars = 0
  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw Object.assign(new Error('invalid message'), { status: 422 })
    }
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      throw Object.assign(new Error('invalid message'), { status: 422 })
    }
    if (content.length < 1 || content.length > 20_000) {
      throw Object.assign(new Error('message length is invalid'), { status: 422 })
    }
    totalChars += content.length
    if (totalChars > 64_000) {
      throw Object.assign(new Error('conversation is too large'), { status: 413 })
    }
    return { role, content }
  })
}

export async function POST(request: NextRequest) {
  try {
    requireSession(request)
    enforceRateLimit(request, 'ai-chat', 30, 5 * 60 * 1000)
    const body = await readJsonBody<{ messages?: unknown }>(request, 96 * 1024)
    const messages = validateMessages(body.messages)
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI provider is not configured' },
        { status: 503 },
      )
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.4,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'AI provider request failed' }, { status: 502 })
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: unknown } }>
    }
    const reply = data.choices?.[0]?.message?.content
    if (typeof reply !== 'string' || !reply) {
      return NextResponse.json({ error: 'AI provider returned an invalid response' }, { status: 502 })
    }

    return NextResponse.json({ reply, requiresApproval: true })
  } catch (error) {
    const status = publicErrorStatus(error)
    return NextResponse.json(
      { error: status === 500 ? 'AI request failed' : (error as Error).message },
      { status },
    )
  }
}
