# invIT — AssetFlow

> Operational SaaS platform for IT inventory, procurement planning and internal requests.

Built for IT departments that want one calm place to manage assets, plan monthly purchases and run operational automations.

## Stack

| Layer    | Tools                                                                                |
| -------- | ------------------------------------------------------------------------------------ |
| UI       | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Motion (Framer) |
| Data     | Prisma ORM · PostgreSQL                                                              |
| Services | Resend (emails) · Supabase Storage · SheetJS / xlsx                                  |
| Visual   | Stitch (design assist)                                                               |
| Deploy   | Vercel · Supabase / Neon                                                             |

## Design

The visual system is **dark-first**, inspired by Linear, Stripe, Ramp, Vercel, Notion and Raycast. See [`DESIGN.md`](./DESIGN.md) for tokens, components and motion guidelines. CSS variables live in [`app/globals.css`](./app/globals.css).

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
invIT/
├── app/                    # Next.js App Router routes
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   └── layout/             # app shell (sidebar, topbar, command palette)
├── features/               # feature-based domain modules
│   ├── inventory/
│   ├── procurement/
│   ├── requests/
│   └── activity/
├── lib/                    # utilities, prisma client, fake-data
├── prisma/                 # schema + seed scripts
└── DESIGN.md               # design system reference
```

## Roadmap

- [x] Bootstrap & design foundation
- [ ] App shell (sidebar, topbar, command palette)
- [ ] Dashboard (KPIs, trend chart, activity feed)
- [ ] Inventory table (filters, search, bulk actions)
- [ ] Procurement queue
- [ ] Requests center
- [ ] Analytics
- [ ] Auth + multi-workspace (later)

## License

Private.
