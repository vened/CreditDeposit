import { createShareImage } from '@/lib/og-image';
// Ordinary route: the file-based OG convention would inject localhost when no domain is configured.
export const dynamic = 'force-static';
export async function GET() { return createShareImage(); }
