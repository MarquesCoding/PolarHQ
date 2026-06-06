/// <reference lib="webworker" />
//
// CLIP runs entirely in the browser so an E2E server never sees the pixels. This worker
// loads a quantized CLIP (WebGPU when available, else WASM) and returns L2-normalised
// image/text embeddings in the same space, so cosine similarity = relevance.

import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  type PreTrainedModel,
  type PreTrainedTokenizer,
  type Processor,
  RawImage,
  env,
} from "@huggingface/transformers"
import { MODEL } from "./model"

// Pull models from the CDN (we ship no local weights).
env.allowLocalModels = false

interface Loaded {
  tokenizer: PreTrainedTokenizer
  processor: Processor
  textModel: PreTrainedModel
  visionModel: PreTrainedModel
}

let loaded: Promise<Loaded> | null = null

const pickDevice = async (): Promise<"webgpu" | "wasm"> => {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    if (gpu && (await gpu.requestAdapter())) return "webgpu"
  } catch {
    /* fall back */
  }
  return "wasm"
}

const load = async (): Promise<Loaded> => {
  const device = await pickDevice()
  const started = performance.now()
  console.log(`[orbit:ml:worker] loading ${MODEL} on ${device}…`)
  const opts = { device, dtype: "q8" as const }
  const [tokenizer, processor, textModel, visionModel] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL),
    AutoProcessor.from_pretrained(MODEL),
    CLIPTextModelWithProjection.from_pretrained(MODEL, opts),
    CLIPVisionModelWithProjection.from_pretrained(MODEL, opts),
  ])
  console.log(`[orbit:ml:worker] model ready on ${device} in ${Math.round(performance.now() - started)}ms`)
  return { tokenizer, processor, textModel, visionModel }
}

const ready = (): Promise<Loaded> => (loaded ??= load())

const l2normalize = (data: ArrayLike<number>): number[] => {
  let norm = 0
  for (let i = 0; i < data.length; i += 1) norm += data[i]! * data[i]!
  norm = Math.sqrt(norm) || 1
  const out = new Array<number>(data.length)
  for (let i = 0; i < data.length; i += 1) out[i] = data[i]! / norm
  return out
}

const embedImage = async (blob: Blob): Promise<number[]> => {
  const { processor, visionModel } = await ready()
  const image = await RawImage.fromBlob(blob)
  const inputs = await processor(image)
  const out = (await visionModel(inputs)) as { image_embeds: { data: Float32Array } }
  return l2normalize(out.image_embeds.data)
}

const embedText = async (text: string): Promise<number[]> => {
  const { tokenizer, textModel } = await ready()
  const inputs = tokenizer([text], { padding: true, truncation: true })
  const out = (await textModel(inputs)) as { text_embeds: { data: Float32Array } }
  return l2normalize(out.text_embeds.data)
}

interface Req {
  id: number
  type: "embed-image" | "embed-text" | "warmup"
  blob?: Blob
  text?: string
  debug?: boolean
}

const ctx = self as unknown as {
  postMessage: (msg: unknown) => void
  addEventListener: (t: "message", h: (e: { data: Req }) => void) => void
}

ctx.addEventListener("message", (event) => {
  const req = event.data
  const started = performance.now()
  const run =
    req.type === "embed-image"
      ? embedImage(req.blob!)
      : req.type === "embed-text"
        ? embedText(req.text!)
        : ready().then(() => [])
  run
    .then((vector) => {
      if (req.debug && req.type !== "warmup")
        console.log(
          `[orbit:ml:worker] ${req.type} (${vector.length}-d) in ${Math.round(performance.now() - started)}ms`,
        )
      ctx.postMessage({ id: req.id, ok: true, vector })
    })
    .catch((error: unknown) =>
      ctx.postMessage({ id: req.id, ok: false, error: (error as Error)?.message ?? "embed failed" }),
    )
})
