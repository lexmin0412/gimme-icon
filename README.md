# Gimme Icon

English | [简体中文](./README.zh-CN.md)

**Natural Language Based Icon Search Engine.**

Say goodbye to memorizing icon names! Find the icon you want quickly with natural language descriptions like "a downward arrow".

[![Vercel](https://img.shields.io/badge/vercel-live-green?style=flat&logo=vercel)](https://gimme-icon-next.vercel.app) [![License](https://img.shields.io/github/license/lexmin0412/gimme-icon?color=blue)](LICENSE)

![Search Example](./screenshots/search_result.png)

## ✨ Why Gimme Icon?

Existing icon platforms (such as Iconify, Heroicons) require you to **know the exact name or keyword** of the icon:

- Want to find a "search" icon? You have to type `search`.
- Want to find a "plus" icon? You have to guess if it's named `add` or `plus` or something else...

But in reality, when you are looking for an icon, the first words that come to mind are descriptions like:
- "A downward arrow"
- "A trash can representing delete"
- "A house with a plus sign"

**Gimme Icon lets you search for icons just like you speak**—no need to memorize naming conventions, semantic understanding leads you straight to the results.

## Features

- ✅ **Natural Language Search**: Speak naturally, AI understands your intent and matches icons.
- 🧩 **Aggregates Multiple Icon Libraries**: Icon data source comes from Iconify, scalable to full icon sets (200+ libraries, 200k+ icons).
- 🎛️ **Console Management**: Provides a visual backend to support batch selection of icons for vectorization.
- 🛡️ **Secure Access**: Login authentication based on GitHub OAuth, supporting user permission differentiation.
- 🚀 **Modern Tech Stack**: Built on Next.js 16 and React 19, supporting Server-Side Rendering (SSR).
- 🌐 **Open Source & Free**: MIT License, free to distribute.

## 🚀 Quick Start

1. Visit Online Demo 👉 [https://gimme-icon-next.vercel.app](https://gimme-icon-next.vercel.app)
2. Try searching:
   - "A downward arrow"
   - "A trash can representing delete"
   - "A house with a plus sign"

## Tech Stack

- **Frontend Framework**: Next.js 16 (App Router) + React 19
- **UI Components**: Shadcn UI + Tailwind CSS 4
- **Authentication**: Better-Auth (GitHub OAuth)
- **Vector Search**:
  - Model: `@huggingface/transformers` (all-MiniLM-L6-v2)
  - Database: ChromaDB
- **Build Tool**: Turbopack
- **Type System**: TypeScript 5
- **Package Manager**: pnpm 10

## Getting Started

### Clone Repository

```bash
git clone https://github.com/lexmin0412/gimme-icon.git
cd gimme-icon
```

### Requirements

- Node.js >= 20
- pnpm >= 10

### Install Dependencies

```bash
pnpm install
```

### Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` to fill in your configuration (GitHub OAuth, Chroma Cloud, email whitelist, etc.).

### Start Development Server

```bash
pnpm dev
```

The application will start at `http://localhost:9588` (port can be modified in `package.json`).

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
├── app/                  # Next.js App Router application directory
│   ├── api/              # API routes (auth, chroma, etc.)
│   ├── console/          # Console pages (requires permission)
│   ├── components/       # Shared components
│   └── page.tsx          # Home page
├── components/           # UI Component Library (shadcn/ui)
├── constants/            # Constant definitions
├── context/              # React Context
├── libs/                 # Third-party library initialization (auth, chroma)
├── public/               # Static assets
├── services/             # Business logic services
│   ├── embedding.ts      # Vectorization service
│   └── icons.ts          # Icon data service
└── types/                # TypeScript type definitions
```

## License

MIT License

## Acknowledgements

During the development and planning process, the following projects were referenced for design:

- [Iconify](https://iconify.design) provided massive icon library resources and APIs.
- [Lucide](https://lucide.dev/) provided UI design inspiration and interaction references.
- [Simple Icons](https://github.com/simple-icons/simple-icons)
- [icones](https://github.com/antfu/icones)
