export function imageQualities() { return [0.8, 0.7, 0.6, 0.5]; }
export function imageDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0) throw new Error('The image could not be read');
  const scale = Math.min(1, 1600 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
export async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    Object.assign(canvas, imageDimensions(bitmap.width, bitmap.height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the image');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of imageQualities()) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 1_200_000) return new File([blob], 'screenshot.jpg', { type: 'image/jpeg' });
    }
    throw new Error('The screenshot is too large. Choose a smaller image.');
  } finally { bitmap.close(); }
}
