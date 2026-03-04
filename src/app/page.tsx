'use client';

import Link from 'next/link';

const GAMES = [
  {
    id: 'tragedy-looper',
    name: '惨剧轮回',
    nameEn: 'Tragedy Looper',
    description: '非对称推理桌游，剧作家 vs 主人公，时间轮回中揭开真相',
    players: '2-4',
  },
  {
    id: 'poison',
    name: 'ポイズン',
    nameEn: 'Poison',
    description: '大锅炼药，避免爆炸！Reiner Knizia 经典卡牌游戏',
    players: '3-6',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">Board Game Hub</h1>
      <p className="text-slate-400 mb-12 text-lg">选择一个游戏开始</p>

      <div className="grid gap-6 w-full max-w-2xl">
        {GAMES.map((game) => (
          <Link key={game.id} href={`/${game.id}`}>
            <div className="group relative rounded-xl border p-6 transition-all
              border-slate-700 bg-slate-900/60 hover:border-blue-500/60 hover:bg-slate-800/80 cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{game.name}</h2>
                  <p className="text-sm text-slate-500">{game.nameEn}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400">{game.description}</p>
              <p className="mt-2 text-xs text-slate-600">{game.players} 人</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
