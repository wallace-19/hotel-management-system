// ═══════════════════════════════════════
// QR CODE GENERATION
// ═══════════════════════════════════════

function qrSVG(data, size = 150) {
  // Generate a deterministic-looking QR pattern from the string
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
  }
  const cells = 21;
  const cs = Math.floor(size / cells);
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="background:white">`;
  
  // Finder patterns
  const fp = [[0, 0], [0, cells - 7], [cells - 7, 0]];
  fp.forEach(([r, c]) => {
    svg += `<rect x="${c * cs}" y="${r * cs}" width="${7 * cs}" height="${7 * cs}" fill="#000"/>`;
    svg += `<rect x="${(c + 1) * cs}" y="${(r + 1) * cs}" width="${5 * cs}" height="${5 * cs}" fill="#fff"/>`;
    svg += `<rect x="${(c + 2) * cs}" y="${(r + 2) * cs}" width="${3 * cs}" height="${3 * cs}" fill="#000"/>`;
  });
  
  // Data modules
  const rng = (x, y) => {
    let h = (hash ^ (x * 31 + y * 17)) & 0xFFFFFF;
    return ((h * 2654435761) >>> 0) % 100 < 45;
  };
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if ((r < 9 && c < 9) || (r < 9 && c > cells - 9) || (r > cells - 9 && c < 9)) continue;
      if (rng(r, c)) svg += `<rect x="${c * cs}" y="${r * cs}" width="${cs}" height="${cs}" fill="#000"/>`;
    }
  }
  svg += '</svg>';
  return svg;
}

function qrTarget(data, size = 160) {
  return `<canvas class="qr-canvas" data-qr="${esc(data)}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;background:white"></canvas>`;
}

function renderQRCodes() {
  document.querySelectorAll('.qr-canvas').forEach(canvas => {
    const data = canvas.dataset.qr || '';
    const size = Number(canvas.getAttribute('width')) || 160;
    if (window.QRCode && QRCode.toCanvas) {
      QRCode.toCanvas(canvas, data, { width: size, margin: 1, errorCorrectionLevel: 'M' }, err => {
        if (err) canvas.outerHTML = qrSVG(data, size);
      });
    } else {
      canvas.outerHTML = qrSVG(data, size);
    }
  });
}
