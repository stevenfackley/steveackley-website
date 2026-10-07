"""Convert blog-draft markdown files (the header-comment convention in
apps/site/blog-drafts/) into dollar-quoted INSERT statements for
steveackleyorg."Post", matching the HTML shape of existing rows.

Usage: python apps/site/scripts/blog-drafts-to-sql.py OUT_DIR DRAFT.md [DRAFT.md ...]
Writes OUT_DIR/<slug>.sql and OUT_DIR/summary.json. Never touches the DB:
run each .sql through the Supabase MCP (or psql) as an unpublished draft.
Requires markdown-it-py (conda: markdown-it-py). Reading time = words / 200.
"""
import json
import re
import sys
import uuid
from pathlib import Path

from markdown_it import MarkdownIt

HEADER_RE = re.compile(r"^\s*<!--(.*?)-->\s*", re.S)
FIELD_RE = re.compile(r"^\s*(Title|Slug|Excerpt|Category|Tags|Cover):\s*(.*?)\s*$", re.M)
DQ = "$blogbody$"


def parse(path: Path):
    text = path.read_text(encoding="utf-8")
    m = HEADER_RE.match(text)
    if not m:
        raise SystemExit(f"{path}: no header comment")
    fields = {k: v for k, v in FIELD_RE.findall(m.group(1))}
    body = text[m.end():].strip() + "\n"
    slug = re.sub(r"\s*\(auto-derived\)\s*$", "", fields.get("Slug", "")).strip() or path.stem
    tags = [t.strip().lower() for t in fields.get("Tags", "").split(",") if t.strip()]
    return {
        "path": str(path),
        "slug": slug,
        "title": fields.get("Title", "").strip(),
        "excerpt": fields.get("Excerpt", "").strip(),
        "category": fields.get("Category", "").strip() or None,
        "tags": tags,
        "body": body,
    }


def to_html(body: str) -> str:
    md = MarkdownIt("commonmark").enable("table")
    html = md.render(body)
    html = re.sub(r">\n+<", "><", html).strip()
    return html


def reading_minutes(html: str) -> int:
    words = len(re.sub(r"<[^>]+>", " ", html).split())
    return max(1, round(words / 200))


def sql_literal(s: str) -> str:
    if DQ in s:
        raise SystemExit("dollar-quote tag collides with content")
    return f"{DQ}{s}{DQ}"


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    summary = []
    for arg in sys.argv[2:]:
        p = parse(Path(arg))
        html = to_html(p["body"])
        minutes = reading_minutes(html)
        pid = str(uuid.uuid4())
        tags_sql = "ARRAY[" + ",".join(sql_literal(t) for t in p["tags"]) + "]::text[]" if p["tags"] else "NULL"
        cat_sql = sql_literal(p["category"]) if p["category"] else "NULL"
        stmt = (
            'INSERT INTO steveackleyorg."Post" '
            '(id, title, slug, content, excerpt, "coverImage", published, "createdAt", "updatedAt", "scheduledAt", tags, category, "readingTimeMinutes") '
            f"VALUES ({sql_literal(pid)}, {sql_literal(p['title'])}, {sql_literal(p['slug'])}, {sql_literal(html)}, "
            f"{sql_literal(p['excerpt'])}, NULL, false, now(), now(), NULL, {tags_sql}, {cat_sql}, {minutes}) "
            "ON CONFLICT (slug) DO NOTHING;\n"
        )
        (out / f"{p['slug']}.sql").write_text(stmt, encoding="utf-8")
        words = len(re.sub(r"<[^>]+>", " ", html).split())
        summary.append({
            "slug": p["slug"], "title": p["title"], "title_len": len(p["title"]),
            "excerpt_len": len(p["excerpt"]), "category": p["category"], "tags": p["tags"],
            "words": words, "minutes": minutes, "html_len": len(html), "id": pid,
        })
    (out / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    for s in summary:
        print(f"{s['slug']:48} {s['words']:5}w {s['minutes']:2}min title={s['title_len']} excerpt={s['excerpt_len']} cat={s['category']} tags={len(s['tags'])}")


if __name__ == "__main__":
    main()
