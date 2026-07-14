//! Image -> 3D point-cloud pipeline.
//!
//! Full 3D Gaussian-Splatting reconstruction from a single image is a heavy ML problem (pretrained
//! networks, GPU, torch/CUDA or COLMAP). None of that can ship inside the desktop app or run offline
//! on an arbitrary machine. What *is* achievable end-to-end, fully offline and in pure Rust, is the
//! pragmatic image->3D path: estimate a monocular depth field from photometric cues, back-project
//! every pixel through a pinhole camera into 3D, colour each point from the source image, and export
//! a `.ply` point cloud the existing Three.js viewer renders as points.
//!
//! The depth here is a photometric proxy (luminance + local detail), not a learned metric depth
//! network — see `depth_field`. A real monocular-depth model (e.g. Depth Anything via ONNX/candle)
//! could replace that single function without touching the back-projection or PLY export.

use std::path::Path;

use image::GenericImageView;

/// Longest side the working image is downscaled to. Keeps the point count (and PLY size) bounded
/// while preserving enough structure for a legible 3D relief.
const MAX_SIDE: u32 = 480;

/// Near/far clip of the reconstructed relief, in the viewer's world units. Brighter, more-detailed
/// pixels are pushed toward `Z_NEAR` (closer to camera); flat/dark pixels fall back toward `Z_FAR`.
const Z_NEAR: f32 = 0.6;
const Z_FAR: f32 = 1.7;

/// Estimate depth from an image, back-project it to a colored 3D point cloud, and write the result
/// as a binary little-endian PLY at `output_path`. Runs fully offline; no ML runtime or network.
pub fn generate_point_cloud_ply(input_path: &str, output_path: &Path) -> Result<(), String> {
    let source = image::open(input_path).map_err(|e| format!("could not read image: {e}"))?;
    let (src_w, src_h) = source.dimensions();
    if src_w == 0 || src_h == 0 {
        return Err("image has no pixels".into());
    }

    let rgb = source.to_rgb8();
    let ratio = (MAX_SIDE as f32 / src_w.max(src_h) as f32).min(1.0);
    let w = ((src_w as f32 * ratio).round() as u32).max(1);
    let h = ((src_h as f32 * ratio).round() as u32).max(1);
    let small = image::imageops::resize(&rgb, w, h, image::imageops::FilterType::Triangle);

    let depth = depth_field(&small, w, h);

    let width = w as f32;
    let height = h as f32;
    let focal = 0.9 * width.max(height);
    let cx = width / 2.0;
    let cy = height / 2.0;

    let count = (w * h) as usize;
    let mut positions: Vec<[f32; 3]> = Vec::with_capacity(count);
    let mut colors: Vec<[u8; 3]> = Vec::with_capacity(count);
    let mut centroid = [0f64; 3];

    for y in 0..h {
        for x in 0..w {
            let d = depth[(y * w + x) as usize];
            let z = Z_NEAR + (1.0 - d) * (Z_FAR - Z_NEAR);
            let point = [
                (x as f32 - cx) / focal * z,
                -(y as f32 - cy) / focal * z,
                -z,
            ];
            centroid[0] += point[0] as f64;
            centroid[1] += point[1] as f64;
            centroid[2] += point[2] as f64;
            positions.push(point);
            let pixel = small.get_pixel(x, y).0;
            colors.push([pixel[0], pixel[1], pixel[2]]);
        }
    }

    let total = positions.len().max(1) as f64;
    let center = [
        (centroid[0] / total) as f32,
        (centroid[1] / total) as f32,
        (centroid[2] / total) as f32,
    ];
    for point in positions.iter_mut() {
        point[0] -= center[0];
        point[1] -= center[1];
        point[2] -= center[2];
    }

    write_ply(output_path, &positions, &colors)
}

/// Blend monocular depth cues into a normalized 0..1 depth field (1 = nearest). Combines a shading
/// cue (brighter surfaces read as closer) with a detail cue (sharp, high-frequency regions read as
/// foreground), then smooths the result so the point cloud forms a continuous relief.
fn depth_field(image: &image::RgbImage, w: u32, h: u32) -> Vec<f32> {
    let count = (w * h) as usize;
    let mut luma = vec![0f32; count];
    for y in 0..h {
        for x in 0..w {
            let p = image.get_pixel(x, y).0;
            luma[(y * w + x) as usize] =
                (0.299 * p[0] as f32 + 0.587 * p[1] as f32 + 0.114 * p[2] as f32) / 255.0;
        }
    }

    let detail = detail_field(&luma, w, h);
    let luma_n = normalize(&luma);
    let detail_n = normalize(&detail);

    let mut depth = vec![0f32; count];
    for i in 0..count {
        depth[i] = 0.55 * luma_n[i] + 0.45 * detail_n[i];
    }
    box_blur(&mut depth, w, h, 2);
    normalize(&depth)
}

/// Sobel gradient magnitude of the luminance field, spread into regions by a box blur. High values
/// mark textured, in-focus areas (a foreground cue); flat areas trend to zero (a background cue).
fn detail_field(luma: &[f32], w: u32, h: u32) -> Vec<f32> {
    let wi = w as i32;
    let hi = h as i32;
    let at = |x: i32, y: i32| -> f32 {
        let xx = x.clamp(0, wi - 1);
        let yy = y.clamp(0, hi - 1);
        luma[(yy * wi + xx) as usize]
    };
    let mut out = vec![0f32; luma.len()];
    for y in 0..hi {
        for x in 0..wi {
            let gx = at(x + 1, y - 1) + 2.0 * at(x + 1, y) + at(x + 1, y + 1)
                - at(x - 1, y - 1)
                - 2.0 * at(x - 1, y)
                - at(x - 1, y + 1);
            let gy = at(x - 1, y + 1) + 2.0 * at(x, y + 1) + at(x + 1, y + 1)
                - at(x - 1, y - 1)
                - 2.0 * at(x, y - 1)
                - at(x + 1, y - 1);
            out[(y * wi + x) as usize] = (gx * gx + gy * gy).sqrt();
        }
    }
    box_blur(&mut out, w, h, 3);
    out
}

/// Separable box blur (one horizontal + one vertical pass) with clamped edges.
fn box_blur(buf: &mut [f32], w: u32, h: u32, radius: i32) {
    if radius <= 0 {
        return;
    }
    let wi = w as i32;
    let hi = h as i32;
    let mut tmp = vec![0f32; buf.len()];
    for y in 0..hi {
        for x in 0..wi {
            let mut sum = 0f32;
            let mut n = 0f32;
            for k in -radius..=radius {
                let xx = (x + k).clamp(0, wi - 1);
                sum += buf[(y * wi + xx) as usize];
                n += 1.0;
            }
            tmp[(y * wi + x) as usize] = sum / n;
        }
    }
    for y in 0..hi {
        for x in 0..wi {
            let mut sum = 0f32;
            let mut n = 0f32;
            for k in -radius..=radius {
                let yy = (y + k).clamp(0, hi - 1);
                sum += tmp[(yy * wi + x) as usize];
                n += 1.0;
            }
            buf[(y * wi + x) as usize] = sum / n;
        }
    }
}

/// Rescale values to 0..1 by min/max. A flat field maps to a constant 0.5.
fn normalize(values: &[f32]) -> Vec<f32> {
    let mut lo = f32::INFINITY;
    let mut hi = f32::NEG_INFINITY;
    for &v in values {
        if v < lo {
            lo = v;
        }
        if v > hi {
            hi = v;
        }
    }
    let range = hi - lo;
    if range <= f32::EPSILON {
        return vec![0.5; values.len()];
    }
    values.iter().map(|&v| (v - lo) / range).collect()
}

/// Serialize positions + colors as a binary little-endian PLY point cloud (x/y/z float, r/g/b uchar).
fn write_ply(path: &Path, positions: &[[f32; 3]], colors: &[[u8; 3]]) -> Result<(), String> {
    let header = format!(
        "ply\nformat binary_little_endian 1.0\nelement vertex {}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n",
        positions.len()
    );
    let mut buf: Vec<u8> = Vec::with_capacity(header.len() + positions.len() * 15);
    buf.extend_from_slice(header.as_bytes());
    for (point, color) in positions.iter().zip(colors.iter()) {
        buf.extend_from_slice(&point[0].to_le_bytes());
        buf.extend_from_slice(&point[1].to_le_bytes());
        buf.extend_from_slice(&point[2].to_le_bytes());
        buf.extend_from_slice(color);
    }
    std::fs::write(path, &buf).map_err(|e| format!("could not write splat: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_a_colored_point_cloud() {
        let mut img = image::RgbImage::new(24, 16);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = image::Rgb([(x * 8) as u8, (y * 8) as u8, 128]);
        }
        let dir = std::env::temp_dir();
        let input = dir.join("polarhq-splat-test-input.png");
        let output = dir.join("polarhq-splat-test-output.ply");
        img.save(&input).unwrap();

        generate_point_cloud_ply(input.to_str().unwrap(), &output).unwrap();

        let bytes = std::fs::read(&output).unwrap();
        let header_end = b"end_header\n";
        let split = bytes
            .windows(header_end.len())
            .position(|w| w == header_end)
            .unwrap()
            + header_end.len();
        let header = String::from_utf8(bytes[..split].to_vec()).unwrap();
        assert!(header.contains("format binary_little_endian 1.0"));
        assert!(header.contains("element vertex 384"));
        assert_eq!(bytes.len() - split, 384 * 15);

        let _ = std::fs::remove_file(&input);
        let _ = std::fs::remove_file(&output);
    }
}
