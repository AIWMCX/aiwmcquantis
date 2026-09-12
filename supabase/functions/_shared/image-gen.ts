// Provider-adapter image generation, shared across Content Studio and (later)
// the Autoposter daily engine. Currently wires only Hugging Face's free
// Inference API (FLUX.1-schnell) -- Gemini and Bloom were both evaluated and
// ruled out 2026-09-11 (Gemini: billing enablement flagged as suspicious by
// Google, no key available; Bloom: connected but workspace has 0 credits).
// Built provider-adapter style so either can be added later as an alternate
// `ImageProvider` without restructuring callers.

export interface ImageProvider {
  name: string;
  generate(prompt: string): Promise<GeneratedImage>;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  contentType: string;
}

export class ImageGenError extends Error {
  constructor(message: string, public readonly retryable: boolean = false) {
    super(message);
  }
}

const HF_MODEL = 'black-forest-labs/FLUX.1-schnell';
// api-inference.huggingface.co (the legacy per-model Inference API host) no
// longer resolves at all as of 2026-09-11 -- confirmed live via a real DNS
// failure ("No address associated with hostname"), not a config/auth error.
// Hugging Face consolidated serverless inference behind a single router
// host; same request/response shape, just a different path prefix.
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

class HuggingFaceProvider implements ImageProvider {
  name = 'huggingface';
  constructor(private readonly token: string) {}

  async generate(prompt: string): Promise<GeneratedImage> {
    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'image/png',
      },
      body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok || contentType.includes('application/json')) {
      // HF returns JSON (not an image) on cold-start ("loading") or error --
      // never treat a JSON body as image bytes.
      const body = await res.text().catch(() => '');
      const retryable = res.status === 503 || /loading/i.test(body);
      throw new ImageGenError(
        `Hugging Face ${res.status}: ${body.slice(0, 300) || 'no body'}`,
        retryable,
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new ImageGenError('Hugging Face returned an empty image body', true);
    }
    return { bytes: new Uint8Array(arrayBuffer), contentType: contentType || 'image/png' };
  }
}

/** Resolves the first configured provider, or null if none is set up. */
export function resolveImageProvider(): ImageProvider | null {
  const hfToken = Deno.env.get('HUGGINGFACE_API_TOKEN');
  if (hfToken) return new HuggingFaceProvider(hfToken);
  return null;
}

/**
 * Generates one image, retrying once after a short delay if the provider
 * reports a retryable (cold-start) failure. Never retries non-retryable
 * errors (bad prompt, invalid token, etc) -- those fail immediately.
 */
export async function generateImageWithRetry(
  provider: ImageProvider,
  prompt: string,
  { retryDelayMs = 4000 }: { retryDelayMs?: number } = {},
): Promise<GeneratedImage> {
  try {
    return await provider.generate(prompt);
  } catch (err) {
    if (err instanceof ImageGenError && err.retryable) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      return await provider.generate(prompt);
    }
    throw err;
  }
}
