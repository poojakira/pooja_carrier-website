import { NextRequest, NextResponse } from 'next/server'
import {
  normalizeHttpUrl,
  publicErrorStatus,
  readJsonBody,
  requireSession,
} from '@/lib/security'

const RESUME_BASE = {
  summary: `AI Security Engineer focused on securing boundaries between AI agents, tools, identities, data, and model artifacts. Builds open-source security tooling across agentic AI, MCP tool access, IAM, model supply-chain, adversarial ML, and model privacy.`,
  experience: [
    'Built inline MCP security gateway monitoring tool calls for prompt injection, PII leakage, shadow servers, and exfiltration patterns with policy enforcement and audit logging',
    'Developed AWS IAM policy analyzer for agent roles detecting risky permissions, trust relationships, and least-privilege violations',
    'Created pre-load Hugging Face model scanner for provenance, impersonation, pickle risk, and supply-chain signals',
    'Implemented LLM red-team framework with adversarial prompt generation and offline detector evaluation',
    'Built membership-inference and model-privacy attack evaluation suite for ML classifiers',
    'Developed FGSM/PGD/C&W adversarial robustness benchmark harness mapped to MITRE ATLAS AML.T0043',
    'Published security repositories with structured JSON evidence and reproducible checks',
    'Led business compliance analysis for aerospace security work at the ASU Technology Innovation Lab',
    'Graduate TA for IT courses at Ira A. Fulton Schools of Engineering, ASU',
  ],
  projects: [
    'mcp-agent-security-gateway: Inline MCP/tool-call inspection for prompt injection, PII leakage, shadow servers [Python, FastAPI]',
    'aws-agent-identity-guard: Static IAM analysis for agent roles, risky permissions, least-privilege violations [Python, AWS IAM]',
    'hf-model-provenance-scanner: Pre-load Hugging Face scanner for provenance, pickle risk, supply-chain signals [Python]',
    'llm-redteam-framework: Adversarial prompt generation and offline detector evaluation [Python]',
    'adversarial-ml-lab: FGSM/PGD/C&W robustness benchmark for CIFAR-10 [Python, PyTorch]',
    'model-privacy-attacks: Membership-inference and model-privacy attack evaluation [Python, PyTorch]',
    'dataset-poisoning-detector: Dataset poisoning and anomalous-sample detection [Python]',
    'PulseNet-RUL-Forecasting: NASA C-MAPSS RUL evaluation with security controls [Python, PyTorch]',
  ],
  skills: ['Agentic AI Security', 'MCP/Tool Security', 'IAM & Least Privilege', 'Model Supply-Chain Security', 'LLM/RAG Security', 'Adversarial ML', 'Prompt Injection Testing', 'Differential Privacy', 'Membership Inference', 'Python', 'FastAPI', 'PyTorch', 'scikit-learn', 'TypeScript', 'AWS IAM', 'Docker', 'GitHub Actions', 'SARIF', 'MITRE ATT&CK', 'Hugging Face'],
}

type TweakRequest = {
  jobLink?: unknown
  jobDescription?: unknown
  fontPreferences?: { family?: unknown; bodySize?: unknown }
}

function safeText(value: unknown, max: number): string {
  if (value == null) return ''
  if (typeof value !== 'string' || value.length > max) {
    throw Object.assign(new Error('Invalid text field'), { status: 422 })
  }
  return value
}

export async function POST(request: NextRequest) {
  try {
    requireSession(request)
    const body = await readJsonBody<TweakRequest>(request, 160 * 1024)
    const jobDescription = safeText(body.jobDescription, 100_000)
    const rawJobLink = safeText(body.jobLink, 4_000)
    const jobLink = rawJobLink ? normalizeHttpUrl(rawJobLink) : null
    if (rawJobLink && !jobLink) {
      return NextResponse.json({ error: 'Job link must be an http(s) URL' }, { status: 422 })
    }
    if (!jobLink && !jobDescription.trim()) {
      return NextResponse.json({ error: 'Provide a job link or description' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'Tailor only from the supplied candidate facts. Never invent facts, metrics, employers, certifications, years of experience, production deployment, or technologies. Preserve the meaning and scope of every claim. Output JSON only with keys summary, skills, experienceHighlights, projectHighlights, fullText.',
              },
              {
                role: 'user',
                content: `Candidate evidence:\n${JSON.stringify(RESUME_BASE)}\n\nJob Link: ${jobLink || ''}\nJob Description: ${jobDescription}\n\nReturn an evidence-constrained draft for human approval.`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 1800,
          }),
          signal: AbortSignal.timeout(20_000),
          cache: 'no-store',
        })

        if (response.ok) {
          const data = await response.json() as {
            choices?: Array<{ message?: { content?: unknown } }>
          }
          const raw = data.choices?.[0]?.message?.content
          if (typeof raw === 'string') {
            const parsed = JSON.parse(raw)
            return NextResponse.json({
              tweakedResume: parsed,
              requiresApproval: true,
              source: 'provider-draft',
            })
          }
        }
      } catch {
        // Deterministic local fallback below.
      }
    }

    const jd = `${jobDescription} ${jobLink || ''}`.toLowerCase()
    const isAgent = ['agent', 'mcp', 'tool', 'autonomous'].some((keyword) => jd.includes(keyword))
    const isCloud = ['aws', 'cloud', 'iam', 'infra'].some((keyword) => jd.includes(keyword))
    const isLLM = ['llm', 'large language', 'nlp', 'prompt', 'rag'].some((keyword) => jd.includes(keyword))

    let summary = RESUME_BASE.summary
    if (isAgent) summary = 'AI Security Engineer focused on agent and tool security, with implemented MCP inspection, IAM policy analysis, model supply-chain scanning, policy enforcement, and audit logging.'
    else if (isLLM) summary = 'AI Security Engineer focused on LLM/RAG security, adversarial prompt evaluation, prompt-injection testing, model privacy, and security evidence.'
    else if (isCloud) summary = 'AI Security Engineer focused on AWS IAM and cloud security controls, with implemented policy analysis, Dockerized services, CI/CD, and security automation.'

    const skills = RESUME_BASE.skills
      .map((skill) => ({
        skill,
        priority:
          (isAgent && /agent|mcp|iam|tool/i.test(skill)) ||
          (isLLM && /llm|prompt|adversarial|privacy/i.test(skill)) ||
          (isCloud && /aws|docker|github|iam/i.test(skill))
            ? 0
            : 1,
      }))
      .sort((a, b) => a.priority - b.priority)
      .map(({ skill }) => skill)
      .slice(0, 12)

    const experienceHighlights = RESUME_BASE.experience.slice(0, 5)
    const projectHighlights = RESUME_BASE.projects.slice(0, 4)

    return NextResponse.json({
      tweakedResume: {
        summary,
        skills,
        experienceHighlights,
        projectHighlights,
        fullText: `POOJA KIRAN BHARADWAJ\n\n${summary}\n\nSKILLS: ${skills.join(', ')}\n\nEXPERIENCE:\n${experienceHighlights.map((item) => '• ' + item).join('\n')}\n\nPROJECTS:\n${projectHighlights.map((item) => '• ' + item).join('\n')}`,
      },
      requiresApproval: true,
      source: 'deterministic-fallback',
    })
  } catch (error) {
    const status = publicErrorStatus(error)
    return NextResponse.json(
      { error: status === 500 ? 'Resume tailoring failed' : (error as Error).message },
      { status },
    )
  }
}
