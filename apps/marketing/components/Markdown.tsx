import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"

const Markdown = ({ children }: { children: string }) => (
  <div className="prose-polar">
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
      {children}
    </ReactMarkdown>
  </div>
)

export default Markdown
