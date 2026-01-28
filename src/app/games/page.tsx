import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingHeader } from "@/components/marketing/header";

const games = [
    {
        id: "chess",
        title: "Chess",
        description: "The classic game of strategy. Play against AI or friends.",
        icon: "/icons8-chess.svg",
        href: "/play",
        status: "Real-time",
        features: ["AI coaching", "Puzzles", "Leagues"],
        color: "bg-blue-50/50 border-blue-100 group-hover:bg-blue-50 group-hover:border-blue-200",
        badgeColor: "bg-blue-100 text-blue-700",
        iconBg: "bg-blue-600/10",
    },
    {
        id: "ludo",
        title: "Ludo",
        description: "Race your tokens to the finish line in this fun multiplayer game.",
        icon: "/assets/ludo-icon-image.jpg",
        href: "/games/ludo",
        status: "AI-Powered",
        features: ["4-Player Mode", "Smart AI", "Global Stats"],
        color: "bg-amber-50/50 border-amber-100 group-hover:bg-amber-50 group-hover:border-amber-200",
        badgeColor: "bg-amber-100 text-amber-700",
        iconBg: "bg-amber-600/10",
    },
];

export default function GamesHubPage() {
    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1a1a1a]">
            <MarketingHeader variant="light" />

            <main className="mx-auto max-w-6xl px-6 pt-32 pb-20">
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
                        Games <span className="text-[var(--accent)]">Hub</span>
                    </h1>
                    <p className="mt-4 text-zinc-500 text-lg max-w-2xl font-medium">
                        Welcome to the ChessPro Games Hub. Choose your challenge and start playing.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    {games.map((game) => (
                        <Link key={game.id} href={game.href}>
                            <Card className={`group relative overflow-hidden border-2 bg-white ${game.color} transition-all duration-300 hover:shadow-2xl hover:shadow-zinc-200/50 hover:-translate-y-1`}>
                                <CardHeader className="flex flex-row items-center gap-6 pb-2">
                                    <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${game.iconBg} p-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
                                        <div className="relative h-full w-full">
                                            <Image
                                                src={game.icon}
                                                alt={`${game.title} icon`}
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <CardTitle className="text-2xl font-bold text-zinc-900">{game.title}</CardTitle>
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${game.badgeColor}`}>
                                                {game.status}
                                            </span>
                                        </div>
                                        <CardDescription className="text-zinc-600 font-medium leading-relaxed">{game.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {game.features.map((feature) => (
                                            <span
                                                key={feature}
                                                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 ring-1 ring-inset ring-zinc-200 group-hover:bg-white group-hover:ring-zinc-300 transition-colors"
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
