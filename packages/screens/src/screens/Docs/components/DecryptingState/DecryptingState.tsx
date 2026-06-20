import { ShieldCheck } from "@phosphor-icons/react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

const LINES = [100, 94, 88, 96, 72, 90, 64]

/** Shown while an encrypted document's content is being decrypted in the browser. */
const DecryptingState = () => {
  const { t } = useTranslation("docs")

  return (
  <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="text-emerald-500"
        animate={{ scale: [1, 1.12, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        <ShieldCheck className="size-9" />
      </motion.div>
      <p className="text-muted-foreground text-sm">{t("decryptingState.decrypting")}</p>
    </div>

    <div className="flex w-full max-w-[560px] flex-col gap-2.5">
      {LINES.map((width, index) => (
        <div
          key={index}
          className="bg-muted relative h-3 overflow-hidden rounded"
          style={{ width: `${width}%` }}
        >
          <motion.div
            className="via-foreground/10 absolute inset-0 bg-gradient-to-r from-transparent to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 1.3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: index * 0.12,
            }}
          />
        </div>
      ))}
    </div>
  </div>
  )
}

export default DecryptingState
