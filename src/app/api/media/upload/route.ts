import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import { MEDIA_ID } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// O navegador envia a foto direto ao Blob (sem o limite de 4,5 MB das funções).
// Aqui só se libera o envio: login com Prontuário, caminho dentro da própria clínica, imagem de até 12 MB.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async pathname => {
        const access = await getAccess();
        if (!access?.clinicId || !access.modules.includes('prontuario')) throw new Error('Acesso não autorizado.');
        const prefix = `clinicas/${access.clinicId}/fotos/`;
        if (!pathname.startsWith(prefix) || !MEDIA_ID.test(pathname.slice(prefix.length))) throw new Error('Caminho inválido.');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
          maximumSizeInBytes: 12 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível enviar.' }, { status: 400 });
  }
}
