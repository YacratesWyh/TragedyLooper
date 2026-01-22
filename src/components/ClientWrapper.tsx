'use client';

import { MultiplayerProvider } from '@/lib/useMultiplayer';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MultiplayerProvider>
      {children}
    </MultiplayerProvider>
  );
}
