import type { Metadata } from "next";
import Link from "next/link";
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
            <Link className="brand" href="/">RSS 复活</Link>
            <nav aria-label="主导航">
              <Link href="/articles" prefetch={false}>文章</Link>
              <Link href="/feeds">订阅管理</Link>
            </nav>
          </div>
        </header>
        <main className="site-width main-content">{children}</main>
      </body>
    </html>
  );
}
