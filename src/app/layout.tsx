import type { Metadata } from "next";
import "./globals.css";
import { ClientWrapper } from "@/shared/ClientWrapper";
import { RoutePreference } from "@/components/RoutePreference";

export const metadata: Metadata = {
  title: "桌游合集 · Board Game Hub",
  description: "惨剧轮回、Poison 与迷子的在线桌游合集",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className="antialiased bg-background text-foreground"
      >
        <ClientWrapper>
          {children}
        </ClientWrapper>
        <RoutePreference />
      </body>
    </html>
  );
}
