import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { assetUrl } from "@/lib/assets";

/**
 * Replace `src="path\to\assets\..."` / `src='/path/to/assets/...'` with the
 * asset-protocol URL so that both markdown `![](…)` and raw HTML `<img>` are
 * served correctly, regardless of how `rehype-raw` / react-markdown interact.
 */
function preprocessAssetSrcs(markdown: string): string {
  return markdown.replace(
    /src=(["'])([^"']*?)(["'])/g,
    (match, quote, path) => {
      if (
        path.includes("/assets/") ||
        path.includes("\\assets\\")
      ) {
        return `src=${quote}${assetUrl(path)}${quote}`;
      }
      return match;
    },
  );
}

/** Avoid double-converting a path that is already an asset-protocol URL. */
function safeAssetUrl(src: string): string {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("asset://")
  ) {
    return src;
  }
  return assetUrl(src);
}

/**
 * Render parsed markdown with:
 * - GFM tables / strikethrough (remark-gfm)
 * - LaTeX math (remark-math + rehype-katex)
 * - Code syntax highlighting (rehype-highlight)
 * - Raw HTML passthrough (rehype-raw)
 *
 * `src` attributes containing asset file paths are preprocessed before the
 * markdown engine runs, so raw HTML `<img>` tags work even when `rehype-raw`
 * does not expose them through `components.img`.
 */
export function MarkdownBlock({ markdown }: { markdown: string }) {
  const processed = preprocessAssetSrcs(markdown);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
        components={{
          img: ({ src, alt }) =>
            src ? (
              <img
                src={safeAssetUrl(String(src))}
                alt={alt ?? ""}
                className="max-w-full h-auto rounded"
              />
            ) : null,
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
