"use client";

import { useActionState } from "react";
import { addFeedAction } from "./actions";

export function FeedForm() {
  const [state, submit, pending] = useActionState(addFeedAction, { url: "", message: "", ok: false });

  return (
    <form action={submit} className="form-stack">
      <label htmlFor="feed-url">订阅地址</label>
      <div className="form-row">
        <input
          id="feed-url"
          name="url"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.url}
          placeholder="https://example.com/feed.xml"
          aria-invalid={Boolean(state.message && !state.ok)}
          aria-describedby={state.message ? "feed-message" : undefined}
        />
        <button type="submit" disabled={pending}>{pending ? "抓取中…" : "添加订阅"}</button>
      </div>
      <div id="feed-message" role="status" className={state.ok ? "muted" : "error"}>{state.message}</div>
    </form>
  );
}
