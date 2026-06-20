import { dateLocale } from "@workspace/i18n/format"
import { useState } from "react"
import type { CommentThread, DocComment } from "@workspace/screens/commentMark"
import { Check, ChatCircleSlash, X } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { t } from "@workspace/i18n/config"
import { useTranslation } from "react-i18next"

interface Draft {
  threadId: string
  range: { from: number; to: number }
}

interface CommentsPanelProps {
  threads: CommentThread[]
  comments: DocComment[]
  activeThread: string | null
  draft: Draft | null
  onClose: () => void
  onSelectThread: (threadId: string) => void
  onSubmitNew: (body: string) => void
  onReply: (threadId: string, body: string) => void
  onResolve: (threadId: string) => void
  onCancelDraft: () => void
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?"

const timeAgo = (ms: number): string => {
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return t("docs:commentsPanel.justNow")
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return new Date(ms).toLocaleDateString(dateLocale())
}

const Composer = ({
  placeholder,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  autoFocus?: boolean
  onSubmit: (body: string) => void
  onCancel?: () => void
}) => {
  const { t } = useTranslation("docs")
  const [value, setValue] = useState("")
  const submit = () => {
    const body = value.trim()
    if (!body) return
    onSubmit(body)
    setValue("")
  }
  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit()
          if (event.key === "Escape") onCancel?.()
        }}
        className="h-8"
      />
      <Button size="sm" disabled={!value.trim()} onClick={submit}>
        {t("commentsPanel.send")}
      </Button>
    </div>
  )
}

/** Side panel showing comment threads anchored in the document. */
const CommentsPanel = ({
  threads,
  comments,
  activeThread,
  draft,
  onClose,
  onSelectThread,
  onSubmitNew,
  onReply,
  onResolve,
  onCancelDraft,
}: CommentsPanelProps) => {
  const { t } = useTranslation("docs")
  const open = threads
    .filter((thread) => !thread.resolved)
    .sort((a, b) => a.createdAt - b.createdAt)

  return (
    <aside className="panel flex h-full w-72 shrink-0 flex-col rounded-xl">
      <header className="border-border/60 flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-sm font-semibold">{t("commentsPanel.title")}</span>
        <Button variant="ghost" size="icon-xs" aria-label={t("commentsPanel.closeComments")} onClick={onClose}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {draft ? (
          <div className="border-primary/50 rounded-lg border p-2">
            <p className="text-muted-foreground mb-1.5 text-xs">{t("commentsPanel.newComment")}</p>
            <Composer autoFocus placeholder={t("commentsPanel.addCommentPlaceholder")} onSubmit={onSubmitNew} onCancel={onCancelDraft} />
          </div>
        ) : null}

        {open.length === 0 && !draft ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm">
            <ChatCircleSlash className="size-6" />
            <p>{t("commentsPanel.empty")}</p>
          </div>
        ) : null}

        {open.map((thread) => {
          const threadComments = comments
            .filter((comment) => comment.threadId === thread.id)
            .sort((a, b) => a.createdAt - b.createdAt)
          return (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-lg border p-2 transition",
                activeThread === thread.id ? "ring-primary border-primary/50 ring-1" : "hover:bg-sidebar-accent/30",
              )}
            >
              {threadComments.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{ backgroundColor: comment.authorColor }}
                      className="flex size-5 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white"
                    >
                      {initials(comment.authorName)}
                    </span>
                    <span className="text-xs font-medium">{comment.authorName}</span>
                    <span className="text-muted-foreground text-[0.65rem]">
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="pl-[1.625rem] text-sm break-words">{comment.body}</p>
                </div>
              ))}

              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <Composer placeholder={t("commentsPanel.replyPlaceholder")} onSubmit={(body) => onReply(thread.id, body)} />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("commentsPanel.resolveThread")}
                  title={t("commentsPanel.resolve")}
                  onClick={(event) => {
                    event.stopPropagation()
                    onResolve(thread.id)
                  }}
                >
                  <Check className="size-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default CommentsPanel
