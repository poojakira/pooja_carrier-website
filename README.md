# Career OS

**Repository owner & maintainer:** Pooja Kiran ([@poojakira](https://github.com/poojakira)) — I own and maintain this repository and drive its design, engineering, validation, documentation, and evidence-backed releases.

Personal career automation tool for job search workflow.

## Features

- **Resume Tweaker** — Paste job link/JD → AI tailors resume → preview → approve/reject → download PDF → email to Gmail
- **Job Tracker** — Track applications (company, role, status, resume version, notes)
- **Resume History** — Every approved tweak saved with search and PDF re-download
- **AI Assistant** — Chat for cover letters, interview prep, project matching
- **GitHub Activity** — Live commit feed and repo list for interview prep

## Setup

```bash
npm install
cp .env.example .env   # add your keys
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Optional | AI tweaking + chat (smart fallback without it) |
| `SMTP_USER` | For email | Gmail address |
| `SMTP_PASS` | For email | Gmail app password |
| `NOTIFICATION_EMAIL` | For email | Where to send (default: pkiran1@asu.edu) |

## Stack

Next.js 15, TypeScript, Tailwind CSS, pdf-lib, nodemailer, OpenAI

## Flow

```
Paste JD → Tweak → Preview → Approve → Download PDF + Email
```

Every tweak asks your permission before applying.
