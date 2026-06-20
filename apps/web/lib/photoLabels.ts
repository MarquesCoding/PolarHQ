import { cosine, embedText } from "@lib/embedder"
import { fetchIndex } from "@lib/photoIndex"

/**
 * Zero-shot labels: CLIP stores a vector per photo, not tags. To get human-readable "tags"
 * we embed a fixed vocabulary of label prompts once and score a photo's vector against them —
 * the highest cosine labels are what the model "sees". Same model, no extra weights.
 */

const CONCEPTS = [
  "a person",
  "a selfie",
  "a group of people",
  "a baby",
  "a dog",
  "a cat",
  "an animal",
  "a bird",
  "food",
  "a meal",
  "a drink",
  "coffee",
  "a beach",
  "the ocean",
  "mountains",
  "a forest",
  "nature",
  "a sunset",
  "the sky",
  "flowers",
  "a plant",
  "a tree",
  "a city",
  "a street",
  "a building",
  "architecture",
  "a car",
  "a document",
  "a screenshot",
  "text",
  "a chart or graph",
  "indoors",
  "outdoors",
  "a party",
  "a wedding",
  "a concert",
  "sports",
  "water",
  "snow",
  "night",
  "a landscape",
  "a portrait",
  "art",
]

let labelVectors: Promise<Array<{ label: string; vector: Float32Array }>> | null = null

const getLabelVectors = (): Promise<Array<{ label: string; vector: Float32Array }>> =>
  (labelVectors ??= Promise.all(
    CONCEPTS.map(async (label) => ({ label, vector: await embedText(`a photo of ${label}`) })),
  ))

export interface ScoredLabel {
  label: string
  score: number
}

/** Top-K zero-shot labels for an image embedding. */
export const labelVector = async (vector: Float32Array, topK = 8): Promise<ScoredLabel[]> => {
  const labels = await getLabelVectors()
  return labels
    .map((l) => ({ label: l.label, score: Number(cosine(vector, l.vector).toFixed(4)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/** Top-K zero-shot labels for an indexed asset (throws if it isn't embedded yet). */
export const labelAsset = async (assetId: string, topK = 8): Promise<ScoredLabel[]> => {
  const index = await fetchIndex()
  const vector = index.get(assetId)
  if (!vector) throw new Error(`asset ${assetId} has no embedding yet`)
  return labelVector(vector, topK)
}
