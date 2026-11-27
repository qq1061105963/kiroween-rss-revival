"use client";

import { useState, useTransition } from "react";
import { markReadAction } from "./actions";

export function ArticleLink({ id, title, link, isRead }: {
  id: number;
  title: string;
  link: string | null;
  isRead: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function mark() {
    if (isRead || pending) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await markReadAction(id);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <h3>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={mark}
            onAuxClick={(event) => { if (event.button === 1) mark(); }}
          >
            {title}
          </a>
        ) : title}
      </h3>
      {!link && !isRead && (
        <button type="button" className="secondary-button" onClick={mark} disabled={pending}>标为已读</button>
      )}
      {failed && <p className="error" role="status">无法标为已读，请重试。</p>}
    </>
  );
}
