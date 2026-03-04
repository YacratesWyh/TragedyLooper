'use client';

import { MultiplayerProvider } from '@/shared/useMultiplayer';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MultiplayerProvider>
      {children}
    </MultiplayerProvider>
  );
}
