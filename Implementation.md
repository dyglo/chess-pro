# ChessPro Implementation Plan (2026)

> Project: ChessPro web app
> Stack: Next.js 16.1+ (App Router, Turbopack, React 19), Tailwind CSS 4, Shadcn-UI, Lucide React, OpenAI GPT-4o
> Package manager: pnpm

## Objectives (from co-founder survey)
- Target users: casual adults, learners 8–16, competitive adults
- Retention goal: average session length ≥ 60 minutes
- Monetization: freemium + ads
- Differentiators: AI coaching, social features, puzzles
- MVP: play vs AI, matchmaking, puzzles, analysis, chat, PWA
- AI features: move explanations, personalized training plans
- Social/community: leagues, friends
- Content cadence: daily puzzles, weekly challenges
- Accessibility: broad, inclusive access
- Visual direction: clean light theme, stone base palette, strong typography, no purple; accents in red/yellow/black
- Timeline: deploy a ready-to-use app today (MVP scaffold + polished landing + shell features)

## Product Principles
- Fast to play (1 click to board), frictionless onboarding
- Retention loops every 5–10 minutes (puzzles, coach prompts, streaks, micro‑rewards)
- Social pressure + progress = long sessions (leagues, friends, challenges)
- Smart guidance, not noisy (AI explanations only when useful)

## Phased Delivery Plan

### Phase 0 — Today: Deployable MVP Skeleton
Goal: shippable app today with branded UI, navigation, and placeholders for core loops.
1) Project scaffolding (completed)
2) Design system + tokens
   - Light theme with stone base, red/yellow/black accents
   - Typography pairing (modern display + readable body)
   - Spacing scale, card styles, button hierarchy, glass‑free UI
3) Landing page
   - Hero + CTA “Play Instantly”
   - Feature sections for AI coach, puzzles, leagues
   - Retention promise banner
4) App shell
   - Layout with top nav, left rail, and main board area
   - Routes: /play, /puzzles, /analysis, /leagues, /friends, /coach
5) PWA baseline
   - App manifest, icons, meta for install
6) Analytics scaffolding
   - Define events and retention metrics
7) Deployment
   - Build, lint, deploy

### Phase 1 — Core Gameplay Loop (COMPLETED)
Goal: get users playing and staying.

#### Chess Engine Implementation
- Custom minimax algorithm with alpha-beta pruning (`src/lib/chess-engine.ts`)
- Piece-square tables for positional evaluation
- 5 difficulty levels with configurable search depth:
  - **Beginner** (depth 1, ~400 rating): Random moves with basic capture awareness
  - **Easy** (depth 2, ~800 rating): Basic tactical awareness
  - **Medium** (depth 3, ~1200 rating): Solid positional play
  - **Hard** (depth 4, ~1600 rating): Strong tactics and strategy
  - **Expert** (depth 5, ~2000 rating): Near-master level play

### Phase 2 — UI/UX Refinements (IN PROGRESS)
Goal: Perfecting the minimalist experience with light theme and viewport optimization.

#### Light Theme Implementation
- Background: Radial stone gradient (`#ffffff` to `#f8f5f2`)
- Header: High-contrast dark text and branding for premium feel on light background
- Controls: Refined button styles with shadow and hover effects

#### Viewport Optimization
- **No-Scroll Layout**: Strict `h-screen overflow-hidden` container
- **Dynamic Sizing**: Chessboard scales based on viewport height to ensure controls are always visible
- **Responsive Layout**: 
  - **Desktop (md+)**: Side-by-side layout (Board left, Controls right) for better utilization of wide screens.
  - **Mobile**: Centered vertical layout (Board top, Controls bottom) to maintain focus.

#### Board Themes 
5 premium chessboard styles:
- **Wooden**: Classic warm wood finish (#f0d9b5 / #b58863)
- **Modern**: Sleek black & white (#ffffff / #1a1a1a)
- **Classic**: Traditional green (#eeeed2 / #769656)
- **Marble**: Elegant gray marble (#f5f5f5 / #607d8b)
- **Emerald**: Rich green luxury (#e8f5e9 / #2e7d32)

#### Play Page Components (`src/components/play/`)
- `chess-board-wrapper.tsx`: Board with theme support, move highlighting, thinking overlay
- `game-controls.tsx`: New Game, Hint, Undo, Resign buttons
- `game-status.tsx`: Turn indicator, check/checkmate display
- `captured-pieces.tsx`: Captured pieces with material advantage
- `move-history.tsx`: PGN-style move list (collapsible on mobile)
- `board-style-selector.tsx`: Theme picker with visual previews
- `difficulty-selector.tsx`: AI level selector with strength indicators
- `sign-in-prompt-modal.tsx`: Sign-in prompt for Hint/Analysis features
- `game-end-modal.tsx`: Game result with leaderboard CTA

#### Responsive Design
- **Mobile (< 640px)**: Full-width board, minimal controls, collapsible history
- **Tablet (640px - 1024px)**: Board with side panel
- **Desktop (> 1024px)**: Full 3-column layout

#### User Features
- Play without sign-in ✓
- Hint requires authentication (sign-in prompt)
- Post-game leaderboard signup CTA

#### Future Enhancements
- Game modes: vs friend, vs matchmaker
- Move list navigation + evaluation panel
- Basic analysis and post‑game review
- Session retention hooks: "one more puzzle" + coach challenge

### Phase 2 — AI Coaching Layer
Goal: personalized, sticky guidance.
- Move explanations on demand
- Personalized training plan (weakness detection)
- Daily coach prompts based on play history
- Safety/latency controls for GPT‑4o

### Phase 3 — Social + Competitive
Goal: communities and repeat visits.
- Leagues with weekly ladders
- Friends + invites
- Clubs and group challenges
- Shareable game highlights

### Phase 4 — Monetization + Growth
Goal: sustainable growth.
- Ads for free users (limited, non‑interrupting gameplay)
- Premium unlocks: advanced analysis, deeper coaching, ad‑free
- SEO pages and discovery features

## Information Architecture (Initial)
- / (landing)
- /play
- /puzzles
- /coach
- /leagues
- /friends
- /settings

## Retention Features (60‑minute goal)
- Streaks + daily puzzle chain
- AI coach nudges every 8–12 moves
- Mini‑quests (“win 2 games in a row”, “solve 3 tactics”)
- League points + limited‑time boosts
- Session milestone badges at 15/30/45/60 minutes

## Data & Metrics (MVP)
- Session length, time to first move, games per session
- Puzzle completion rate, streaks, daily active minutes
- Coach engagement (open rate, follow‑through rate)
- League participation and invites

## Deliverables Today
- Implementation.md (this file)
- Next.js app scaffold
- Branded UI + landing
- App shell with routes
- PWA manifest + icons placeholders

## Next Actions (immediately after this plan)
1) Build UI theme (stone base, red/yellow/black)
2) Create logo and typography selection
3) Implement landing + app shell
4) Add PWA config
5) Wire basic navigation
6) Run `pnpm lint` and `pnpm build`

## Open Questions to Finalize Later
- Ad network preference?
- Login method (email, Google, Apple, guest)?
- Chess engine choice (stockfish wasm vs server engine)?
- Realtime stack (WebSockets provider, matchmaking server)?
- Analytics provider?
