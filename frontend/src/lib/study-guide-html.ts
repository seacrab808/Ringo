/** Mirrors backend study_guide_styles.py for in-app HTML preview. */

export const RINGO_STUDY_GUIDE_CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body {
  font-family: "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
  font-size: 14px;
  line-height: 1.65;
  color: #1e293b;
  background: #ffffff;
  margin: 0;
  padding: 12px;
}
.ringo-study-guide { max-width: 100%; }
.sg-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f766e;
  border-bottom: 3px solid #2dd4bf;
  padding-bottom: 8px;
  margin: 0 0 20px;
}
.sg-section { margin: 28px 0; }
.sg-section-title {
  font-size: 17px;
  font-weight: 700;
  color: #0e7490;
  margin: 0 0 12px;
}
.sg-card {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 12px;
  padding: 14px 16px;
  margin: 10px 0;
}
.sg-card-muted {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  margin: 10px 0;
}
.sg-highlight {
  background: #ecfdf5;
  border-left: 4px solid #10b981;
  padding: 10px 14px;
  margin: 10px 0;
  border-radius: 0 8px 8px 0;
}
.sg-page-ref { font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 6px; }
.sg-term-card {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 12px 14px;
  margin: 8px 0;
}
.sg-term-name { font-weight: 700; color: #1d4ed8; margin-bottom: 4px; }
.sg-diagram {
  background: #f8fafc;
  border: 1px dashed #94a3b8;
  border-radius: 10px;
  padding: 12px;
  margin: 12px 0;
  overflow-x: auto;
}
.sg-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}
.sg-table th {
  background: #e0f2fe;
  color: #0c4a6e;
  padding: 8px 10px;
  text-align: left;
  border: 1px solid #bae6fd;
}
.sg-table td {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  vertical-align: top;
}
.sg-flow { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
.sg-flow-step {
  background: #fff;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}
.sg-arrow { color: #0d9488; font-weight: bold; }
pre, code {
  font-family: Consolas, "D2Coding", monospace;
  font-size: 13px;
  background: #f1f5f9;
  border-radius: 6px;
}
pre { padding: 12px; overflow-x: auto; border: 1px solid #e2e8f0; }
code { padding: 2px 6px; }
ul, ol { padding-left: 1.4em; margin: 8px 0; }
li { margin: 4px 0; }
img { max-width: 100%; height: auto; border-radius: 8px; }
`;

export function isHtmlStudyGuide(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    lower.startsWith("<!doctype") ||
    lower.startsWith("<html") ||
    lower.includes("<article") ||
    (lower.includes("<div") && lower.includes("sg-section"))
  );
}

export function wrapStudyGuidePreview(body: string, title: string): string {
  const trimmed = body.trim();
  if (trimmed.toLowerCase().startsWith("<!doctype") || trimmed.toLowerCase().startsWith("<html")) {
    if (!trimmed.includes("sg-section") && !trimmed.includes(RINGO_STUDY_GUIDE_CSS.slice(0, 30))) {
      return trimmed.replace(/<head([^>]*)>/i, `<head$1><style>${RINGO_STUDY_GUIDE_CSS}</style>`);
    }
    return trimmed;
  }
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>${RINGO_STUDY_GUIDE_CSS}</style>
</head>
<body>
  <article class="ringo-study-guide">${trimmed}</article>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stripUnsafeHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

/** Body/article inner HTML for inline page rendering (no iframe scroll). */
export function extractStudyGuideBody(content: string): string {
  const trimmed = stripUnsafeHtml(content.trim());
  if (!trimmed) return "";
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  const articleMatch = trimmed.match(/<article[^>]*>([\s\S]*)<\/article>/i);
  if (articleMatch) return articleMatch[1].trim();
  if (isHtmlStudyGuide(trimmed)) return trimmed;
  return "";
}
