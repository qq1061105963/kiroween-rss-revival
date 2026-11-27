import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <h1>RSS 阅读器</h1>
      <p className="muted">添加一个 RSS 或 Atom 地址，开始关注你常读的来源。</p>
      <Link href="/feeds" className="button">管理订阅</Link>
    </>
  );
}
