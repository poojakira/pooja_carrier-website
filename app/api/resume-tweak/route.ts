import { NextRequest, NextResponse } from 'next/server'

const RESUME_BASE = {
  summary: `AI Security Engineer focused on securing boundaries between AI agents, tools, identities, data, and model artifacts. Builds open-source security tooling across agentic AI, MCP tool access, IAM, model supply-chain, adversarial ML, and model privacy.`,
  experience: [
    'Built inline MCP security gateway monitoring tool calls for prompt injection, PII leakage, shadow servers, and exfiltration patterns with policy enforcement and audit logging',
    'Developed AWS IAM policy analyzer for agent roles detecting risky permissions, trust relationships, and least-privilege violations',
    'Created pre-load Hugging Face model scanner for provenance, impersonation, pickle risk, and supply-chain signals',
    'Implemented LLM red-team framework with adversarial prompt generation and offline detector evaluation',
    'Built membership-inference and model-privacy attack evaluation suite for ML classifiers',
    'Developed FGSM/PGD/C&W adversarial robustness benchmark harness mapped to MITRE ATLAS AML.T0043',
    'Published 13+ security repositories with structured JSON evidence and reproducible checks',
    'Led business compliance analysis for aerospace security research at AEROSEC/ASU Tech Innovation Lab',
    'Graduate TA for IT courses at Ira A. Fulton Schools of Engineering, ASU',
  ],
  projects: [
    'mcp-agent-security-gateway: Inline MCP/tool-call inspection for prompt injection, PII leakage, shadow servers [Python, FastAPI]',
    'aws-agent-identity-guard: Static IAM analysis for agent roles, risky permissions, least-privilege violations [Python, AWS IAM]',
    'hf-model-provenance-scanner: Pre-load Hugging Face scanner for provenance, pickle risk, supply-chain signals [Python]',
    'llm-redteam-framework: Adversarial prompt generation and offline detector evaluation [Python]',
    'adversarial-ml-lab: FGSM/PGD/C&W robustness benchmark for CIFAR-10, MITRE ATLAS AML.T0043 [Python, PyTorch]',
    'model-privacy-attacks: Membership-inference and model-privacy attack evaluation [Python, PyTorch]',
    'dataset-poisoning-detector: Dataset poisoning and anomalous-sample detection [Python]',
    'PulseNet-RUL-Forecasting: NASA C-MAPSS RUL forecasting with adversarial checks [Python, PyTorch]',
  ],
  skills: ['Agentic AI Security', 'MCP/Tool Security', 'IAM & Least Privilege', 'Model Supply-Chain Security', 'LLM/RAG Security', 'Adversarial ML', 'Prompt Injection Testing', 'Differential Privacy', 'Membership Inference', 'Python', 'FastAPI', 'PyTorch', 'scikit-learn', 'TypeScript', 'AWS IAM', 'Docker', 'GitHub Actions', 'SARIF', 'MITRE ATT&CK', 'Hugging Face'],
}

export async function POST(request: NextRequest) {
  try {
    const { jobLink, jobDescription, fontPreferences } = await request.json()
    if (!jobLink && !jobDescription) return NextResponse.json({ error: 'Provide a job link or description' }, { status: 400 })

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You tailor resumes to job postings. Output JSON only with keys: summary, skills (array), experienceHighlights (array), projectHighlights (array), fullText (string).' },
              { role: 'user', content: `Candidate:\n${JSON.stringify(RESUME_BASE)}\n\nJob Link: ${jobLink}\nJob Description: ${jobDescription}\nFont: ${fontPreferences?.family}, ${fontPreferences?.bodySize}pt\n\nTailor the resume for this job. Return JSON.` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const parsed = JSON.parse(data.choices[0].message.content)
          return NextResponse.json({ tweakedResume: parsed })
        }
      } catch { /* fall through to local */ }
    }

    // Local fallback
    const jd = (jobDescription + ' ' + jobLink).toLowerCase()
    const isAgent = ['agent', 'mcp', 'tool', 'autonomous'].some(k => jd.includes(k))
    const isCloud = ['aws', 'cloud', 'iam', 'infra'].some(k => jd.includes(k))
    const isLLM = ['llm', 'large language', 'nlp', 'prompt', 'rag'].some(k => jd.includes(k))

    let summary = RESUME_BASE.summary
    if (isAgent) summary = 'AI Security Engineer specializing in securing agentic AI systems. Built MCP tool-call inspection gateway, IAM policy analyzer for agent roles, and model supply-chain scanners. Deep expertise in policy enforcement, audit logging, and tool access boundaries.'
    else if (isLLM) summary = 'AI Security Engineer focused on LLM/RAG security. Built adversarial prompt generation frameworks, offline detector evaluation suites, and prompt-injection testing tools. Research spans model privacy, membership inference, and differential privacy.'
    else if (isCloud) summary = 'AI Security Engineer with strong AWS/cloud security expertise. Built IAM policy analyzers detecting risky permissions and least-privilege violations for AI agent roles. Experience with Docker, CI/CD, GitHub Actions, and infrastructure security.'

    const skills = RESUME_BASE.skills.filter(s => {
      const sl = s.toLowerCase()
      if (isAgent && ['agent', 'mcp', 'iam', 'tool'].some(k => sl.includes(k))) return true
      if (isLLM && ['llm', 'prompt', 'adversarial', 'privacy'].some(k => sl.includes(k))) return true
      if (isCloud && ['aws', 'docker', 'github', 'iam'].some(k => sl.includes(k))) return true
      return true
    }).slice(0, 10)

    const experienceHighlights = RESUME_BASE.experience.slice(0, 5)
    const projectHighlights = RESUME_BASE.projects.slice(0, 4)

    return NextResponse.json({
      tweakedResume: {
        summary,
        skills,
        experienceHighlights,
        projectHighlights,
        fullText: `POOJA KIRAN BHARADWAJ\n\n${summary}\n\nSKILLS: ${skills.join(', ')}\n\nEXPERIENCE:\n${experienceHighlights.map(h => '• ' + h).join('\n')}\n\nPROJECTS:\n${projectHighlights.map(p => '• ' + p).join('\n')}`,
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to tweak resume' }, { status: 500 })
  }
}
