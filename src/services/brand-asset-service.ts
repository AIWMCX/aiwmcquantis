import { supabase } from '@/integrations/supabase/client';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 400;
const MAX_HEIGHT = 200;

function getExtension(file: File): string {
  if (file.type === 'image/svg+xml') return 'svg';
  if (file.type === 'image/png') return 'png';
  return 'jpg';
}

async function resizeImage(file: File): Promise<Blob> {
  // SVGs don't need resizing
  if (file.type === 'image/svg+xml') return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export canvas'))),
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.9,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export async function uploadLogo(userId: string, file: File): Promise<string> {
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Logo must be PNG, JPG, or SVG');
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Logo must be under 5 MB');
  }

  // Resize
  const resized = await resizeImage(file);
  const ext = getExtension(file);
  const path = `logos/${userId}/logo.${ext}`;

  // Upload (upsert to overwrite previous logo)
  const { error } = await supabase.storage
    .from('brand-assets')
    .upload(path, resized, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Get public URL
  const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteLogo(userId: string): Promise<void> {
  // List and delete all files in the user's logos folder
  const { data: files } = await supabase.storage
    .from('brand-assets')
    .list(`logos/${userId}`);

  if (files && files.length > 0) {
    const paths = files.map((f) => `logos/${userId}/${f.name}`);
    await supabase.storage.from('brand-assets').remove(paths);
  }
}
