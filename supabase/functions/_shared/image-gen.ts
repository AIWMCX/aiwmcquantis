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
// Hugging Face's classic per-model Inference API (api-inference.huggingface.co,
// then router.huggingface.co/hf-inference/models/...) no longer serves this
// model at all -- confirmed live twice: first a DNS failure on the old host,
// then a 410 "deprecated, no longer supported by provider hf-inference" on
// the router path. Queried HF's own model API
// (huggingface.co/api/models/black-forest-labs/FLUX.1-schnell?expand[]=inferenceProviderMapping)
// and confirmed this model is still live today via three routed providers:
// nscale, fal-ai, wavespeed (not hf-inference itself). Using nscale -- its
// providerId matches the model id verbatim (least third-party divergence)
// -- via HF's unified OpenAI-compatible images endpoint, which is how HF
// documents calling any routed provider consistently.
const HF_IMAGES_URL = 'https://router.huggingface.co/nscale/v1/images/generations';

class HuggingFaceProvider implements ImageProvider {
  name = 'huggingface';
  constructor(private readonly token: string) {}

  async generate(prompt: string): Promise<GeneratedImage> {
    const res = await fetch(HF_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: HF_MODEL, prompt, response_format: 'b64_json' }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const retryable = res.status === 503 || res.status === 429 || /loading/i.test(body);
      throw new ImageGenError(
        `Hugging Face (nscale) ${res.status}: ${body.slice(0, 300) || 'no body'}`,
        retryable,
      );
    }

    const json = await res.json().catch(() => null) as { data?: Array<{ b64_json?: string; url?: string }> } | null;
    const item = json?.data?.[0];
    if (!item) {
      throw new ImageGenError('Hugging Face (nscale) returned no image data', false);
    }

    if (item.b64_json) {
      const binary = atob(item.b64_json);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { bytes, contentType: 'image/png' };
    }

    if (item.url) {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) throw new ImageGenError(`Hugging Face (nscale) image fetch failed: ${imgRes.status}`, true);
      const arrayBuffer = await imgRes.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new ImageGenError('Hugging Face (nscale) returned an empty image body', true);
      }
      const contentType = imgRes.headers.get('content-type') || 'image/png';
      return { bytes: new Uint8Array(arrayBuffer), contentType };
    }

    throw new ImageGenError('Hugging Face (nscale) response had neither b64_json nor url', false);
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
