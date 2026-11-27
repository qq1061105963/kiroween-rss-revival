import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RSS 复活", template: "%s · RSS 复活" },
  description: "把你关心的订阅集中在一个阅读器里。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="site-width">
            <a className="brand" href="/">RSS 复活</a>
          </div>
        </header>
        <main className="site-width main-content">{children}</main>
      </body>
    </html>
  );
}
