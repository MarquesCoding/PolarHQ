// Shared embedder constants — kept free of transformers.js so the main bundle can import
// MODEL_VERSION without pulling the (heavy) library out of the worker chunk.

export const MODEL = "Xenova/clip-vit-base-patch32"

/** Bump when the model/preprocessing changes — embeddings of other versions are re-indexed. */
export const MODEL_VERSION = "clip-vit-base-patch32-q8"
