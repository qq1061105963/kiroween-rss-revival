"use client";

import { useActionState } from "react";
import { importOpmlAction } from "./actions";

export function OpmlForm() {
  const [state, submit, pending] = useActionState(importOpmlAction, { message: "", results: [] });

  return (
    <>
      <form action={submit} className="form-stack">
        <label htmlFor="opml-file">选择 OPML 文件</label>
        <div className="form-row">
          <input id="opml-file" type="file" name="opml" accept=".opml,.xml,application/xml,text/xml,text/x-opml" />
          <button type="submit" disabled={pending}>{pending ? "正在导入…" : "导入 OPML"}</button>
        </div>
        <div role="status" className={state.results.length ? "muted" : "error"}>{state.message}</div>
      </form>
      {state.results.length > 0 && (
        <ul className="opml-results" aria-label="导入结果">
          {state.results.map((entry, index) => (
            <li key={index}>
              <span className={entry.ok ? "muted" : "error"}>{entry.ok ? "成功" : "失败"}</span>
              <div>
                {entry.title && <strong>{entry.title}</strong>}
                <div>{entry.url || "未填写订阅地址"}</div>
                {!entry.ok && <div className="error">{entry.message}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
