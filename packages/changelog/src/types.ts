export interface Release {
  version: string
  date: string
  /** Optional curated headline; auto-generated releases may omit it. */
  title?: string
  tags?: string[]
  /** Markdown body of the release notes. */
  content: string
}
