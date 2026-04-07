# Unjargon

Unjargon turns dense, jargon-heavy content into structured, readable explanations.

## Problem

A lot of information online, especially legal, medical, financial, and technical content, is technically accessible but still hard to use. Even when people can look up terms, the writing itself is often dense enough that understanding the actual point takes too long.

General-purpose AI tools can help, but they often ramble, change structure from one answer to the next, or need follow-up prompts before the output is actually useful.

Unjargon was built around a simpler idea: explanations should be clear, consistent, and usable on the first pass.

## What It Does

Unjargon takes text, PDFs, or images and rewrites them into a fixed three-part format:

1. Summary
2. Main Points
3. Helpful Definitions

The goal is not just simplification. It is predictable structure. The output is meant to be easy to scan and immediately useful without extra prompting.

## Key Features

- **Structured output by default**  
  Every response follows the same three-section format.

- **Domain-aware explanations**  
  Adjusts tone and focus for areas like legal, medical, financial, and technical content.

- **Level control**  
  Lets users tune explanations from beginner to professional.

- **Multiple input types**  
  Supports raw text, PDFs, and images.

- **Streaming responses**  
  Renders output progressively for faster feedback.

- **Side-by-side comparison**  
  Makes it easier to compare the original content with the simplified version.

- **Local chat history**  
  Saves previous simplifications in the browser.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| AI | OpenAI API |
| File handling | AWS S3 |

## Live Demo

[unjargon.ai](https://unjargon.ai)

## Local Setup

Clone the repo and install dependencies:

```bash
git clone https://github.com/andrew-zhouu/unjargon-ai.git
cd unjargon
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment Variables

Create a `.env.local` file in the project root:

```bash
OPENAI_API_KEY=

S3_REGION=
S3_BUCKET=
S3_PUBLIC_BASE=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

MAINTENANCE_MODE=
MAINTENANCE_MESSAGE=
```

## Current State

This project was built and iterated on quickly around a real working product.

The app itself is stable and has handled real usage, including 1000+ uses. The codebase, though, reflects fast iteration more than long-term cleanup. Some parts are still rough, including larger components and places where the abstraction could be cleaner.

That said, the core system is fully working: multi-input handling, structured output generation, and streaming are all in place.

## Why I Built It

Unjargon started from a simple observation: clarity is not just about making language easier. It is also about making information easier to use.

That is why the product focuses so heavily on structure. A good explanation should not just be accurate. It should also be organized in a way that makes the next step obvious.

## Future Improvements

- Better component modularization
- More robust PDF parsing, especially for scanned documents
- Improved error handling and edge-case coverage
- Cleaner separation between client and server logic