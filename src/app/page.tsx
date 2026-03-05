'use client';

import { useState } from 'react';
import Link from 'next/link';
import changelog from '@/changelog';

const GAMES = [
  {
    id: 'tragedy-looper',
    name: '惨剧轮回',
    nameEn: 'Tragedy Looper',
    tagline: '命运已被书写，而你还有几次机会去改写它。',
    description: '剧作家在暗处编织惨剧，主人公在一次次轮回中拼凑真相。每一天的行动都是博弈，每一次死亡都是线索。',
    players: '2-4',
  },
  {
    id: 'poison',
    name: 'ポイズン',
    nameEn: 'Poison',
    tagline: '添一勺没事，再添一勺……谁来收场？',
    description: '三口沸腾的大锅，每回合你必须往里加料或硬着头皮端走。Knizia 式的优雅博弈——规则三分钟学会，心理战贯穿全程。',
    players: '3-6',
  },
];

export default function Home() {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const latest = changelog[0];

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
                <span className="text-xs text-slate-600 shrink-0">{game.players} 人</span>
              </div>
              <p className="mt-2 text-sm italic text-slate-400">{game.tagline}</p>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{game.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 w-full max-w-2xl">
        <button
          onClick={() => setChangelogOpen(!changelogOpen)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <span className="select-none">{changelogOpen ? '▾' : '▸'}</span>
          <span>v{latest.version}</span>
          <span className="text-slate-600">· {latest.date}</span>
          <span className="text-slate-600">· 更新日志</span>
        </button>

        {changelogOpen && (
          <div className="mt-3 space-y-4 border-l-2 border-slate-800 pl-4">
            {changelog.map((entry) => (
              <div key={entry.version}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-300">v{entry.version}</span>
                  <span className="text-xs text-slate-600">{entry.date}</span>
                </div>
                <ul className="space-y-0.5">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-xs text-slate-500 before:content-['·'] before:mr-1.5 before:text-slate-700">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
