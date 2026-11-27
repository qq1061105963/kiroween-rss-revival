import { exportOpml } from "../../../lib/rss";

export function GET() {
  return new Response(exportOpml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rss-revival.opml"',
      "Cache-Control": "no-store",
    },
  });
}
