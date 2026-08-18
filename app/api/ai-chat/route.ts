import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are Pooja Kiran Bharadwaj's personal career assistant. You know her background:

- AI Security Engineer, M.S. IT at ASU (Aug 2024 - May 2026)
- B.Tech CS from M.S. Ramaiah University (2019-2023)
- Independent AI Security Researcher since Aug 2024
- Built 13+ open-source security tools: MCP security gateway, AWS IAM analyzer, HF model scanner, LLM red-team framework, adversarial ML lab, model privacy attacks, dataset poisoning detector, etc.
- Published IEEE INDICON 2023 paper on RL-based e-learning
- Skills: Python, FastAPI, PyTorch, scikit-learn, AWS IAM, Docker, GitHub Actions, TypeScript
- Focus areas: Agentic AI Security, MCP/Tool Security, IAM, Model Supply-Chain, LLM/RAG Security, Adversarial ML
- F-1 OPT, open to relocation, Greater Phoenix AZ
- Certs: AWS Cloud Security Foundations, Honeywell/ASU Tech Innovation Lab, KSCST Research Grant

Help with: cover letters, interview prep, project explanations, matching projects to job descriptions, resume bullet rewording, job search strategy. Be concise and actionable.`

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ reply: 'OPENAI_API_KEY not set in .env — add it to enable AI chat.' })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-10)],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ reply: 'OpenAI API error. Check your key.' })
    }

    const data = await res.json()
    return NextResponse.json({ reply: data.choices[0].message.content })
  } catch {
    return NextResponse.json({ reply: 'Something went wrong.' })
  }
}
