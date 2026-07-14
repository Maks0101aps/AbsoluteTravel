// Client-side image handling for place submissions: read a picked file, resize
// it down to a sane max dimension and re-encode as a compressed JPEG data URL.
// Keeps payloads small enough to embed in the JSON request (and the DB).

const MAX_DIM = 1280;
const QUALITY = 0.78;

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Це не зображення');
  }

  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не вдалося обробити зображення');
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', QUALITY);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не вдалося завантажити зображення'));
    img.src = src;
  });
}
