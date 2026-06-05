import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export interface VideoProbe {
  width: number | null
  height: number | null
  duration: number | null
}

const run = (command: string, args: string[]): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const proc = spawn(command, args)
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    proc.stdout.on("data", (chunk: Buffer) => stdout.push(chunk))
    proc.stderr.on("data", (chunk: Buffer) => stderr.push(chunk))
    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(stdout))
      else reject(new Error(`${command} exited ${code}: ${Buffer.concat(stderr).toString().slice(-400)}`))
    })
  })

const withTempDir = async <T>(fn: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(join(tmpdir(), "orbit-media-"))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Decode a single still frame (HEIC/HEIF or any ffmpeg-readable image) to a PNG buffer. */
export const decodeToPng = (buffer: Buffer, ext: string): Promise<Buffer> =>
  withTempDir(async (dir) => {
    const input = join(dir, `input${ext}`)
    await writeFile(input, buffer)
    return run("ffmpeg", ["-v", "error", "-i", input, "-frames:v", "1", "-f", "image2", "-c:v", "png", "pipe:1"])
  })

/** Probe a video for its display dimensions and duration. */
export const probeVideo = (buffer: Buffer, ext: string): Promise<VideoProbe> =>
  withTempDir(async (dir) => {
    const input = join(dir, `input${ext}`)
    await writeFile(input, buffer)
    const json = await run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration",
      "-of",
      "json",
      input,
    ])
    const data = JSON.parse(json.toString()) as {
      streams?: Array<{ width?: number; height?: number }>
      format?: { duration?: string }
    }
    const stream = data.streams?.[0] ?? {}
    return {
      width: stream.width ?? null,
      height: stream.height ?? null,
      duration: Number(data.format?.duration) || null,
    }
  })

/** Extract a representative poster frame from a video as a PNG buffer. */
export const extractPoster = (buffer: Buffer, ext: string): Promise<Buffer> =>
  withTempDir(async (dir) => {
    const input = join(dir, `input${ext}`)
    await writeFile(input, buffer)
    const seeked = ["-v", "error", "-ss", "00:00:01", "-i", input, "-frames:v", "1", "-f", "image2", "-c:v", "png", "pipe:1"]
    const start = ["-v", "error", "-i", input, "-frames:v", "1", "-f", "image2", "-c:v", "png", "pipe:1"]
    return run("ffmpeg", seeked).catch(() => run("ffmpeg", start))
  })

/** Transcode a video to a web-friendly H.264/AAC mp4 (faststart, capped at 1080p height). */
export const transcodeToMp4 = (buffer: Buffer, ext: string): Promise<Buffer> =>
  withTempDir(async (dir) => {
    const input = join(dir, `input${ext}`)
    const output = join(dir, "playback.mp4")
    await writeFile(input, buffer)
    await run("ffmpeg", [
      "-v",
      "error",
      "-i",
      input,
      "-vf",
      "scale='trunc(min(1,1080/ih)*iw/2)*2':'trunc(min(1,1080/ih)*ih/2)*2'",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-y",
      output,
    ])
    return readFile(output)
  })
