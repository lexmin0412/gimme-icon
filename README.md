<div align="center">
  <h1 align="center">Gimme Icon</h1>

  <p align="center">
    <strong>Semantic Icon Search Engine</strong>
  </p>

  <p align="center">
    Built with Next.js 16, React 19, Transformers.js, and ChromaDB.
  </p>

  <p align="center">
    <a href="https://gimme-icon-next.vercel.app"><strong>Online Demo</strong></a> ·
    <a href="#features"><strong>Features</strong></a> ·
    <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
    <a href="#getting-started"><strong>Getting Started</strong></a> ·
    <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a>
  </p>

  <br/>

  <p align="center">
    English | <a href="./README.zh-CN.md">简体中文</a>
  </p>

  [![Vercel](https://img.shields.io/badge/vercel-live-green?style=flat&logo=vercel)](https://gimme-icon-next.vercel.app)
  [![License](https://img.shields.io/github/license/lexmin0412/gimme-icon?color=blue)](LICENSE)
</div>

<br/>

![Home](./screenshots/home.png)

## ✨ Why Gimme Icon?

Traditional icon libraries (Iconify, Heroicons) force you to **memorize keywords**.

- Want a "search" icon? You type `search`.
- Want a "plus" icon? You guess: `add`? `plus`? `create`?

**Gimme Icon** changes the game. Describe what you see in your mind:
- "A downward arrow"
- "A trash can representing delete"
- "A house with a plus sign"

Understands your intent, not just your keywords.

![Search Result](./screenshots/search_result_en.png)

## Features

- **Semantic Search**: Powered by `@huggingface/transformers` (paraphrase-multilingual-MiniLM-L12-v2) running locally or on the edge.
- **Vector Search**:
  - **ChromaDB**: Switch to a robust vector database for production scale.
- **Massive Icon Library**: Aggregates 200k+ icons from 200+ collections via Iconify.
- **Modern UI/UX**: Built with Shadcn UI and Tailwind CSS 4 for a beautiful, responsive experience.
- **Authentication**: Secure GitHub OAuth integration using Better-Auth.
- **Management Console**: Visual backend for batch vectorization and management.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **AI & Vectors**:
  - [Transformers.js](https://huggingface.co/docs/transformers.js) for embedding generation
  - [ChromaDB](https://www.trychroma.com/) for vector storage
- **Auth**: [Better-Auth](https://www.better-auth.com/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## Deploy Your Own

You can deploy your own instance of Gimme Icon to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flexmin0412%2Fgimme-icon&env=BETTER_AUTH_SECRET,BETTER_AUTH_URL,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET)

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/lexmin0412/gimme-icon.git
   cd gimme-icon
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure Environment**

   Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your credentials (required for Auth and optional ChromaDB).

4. **Run Development Server**

   ```bash
   pnpm dev
   ```

   Visit `http://localhost:9588`.

   > **Note**: On the first launch, the app will automatically download the embedding model and generate vectors for the default icon set.

### Building for Production

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

- [Iconify](https://iconify.design) - The universal icon framework.
- [Lucide](https://lucide.dev/) - Beautiful & consistent icons.
- [Simple Icons](https://simpleicons.org/) - Free SVG icons for popular brands.
