import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

/**
 * Saves an uploaded File to Supabase Storage and returns the
 * public-accessible download URL.
 *
 * @throws {Error} if file type or size is not allowed
 */
export async function saveUploadedFile(file: File): Promise<string> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Credenciais do Supabase não configuradas no servidor.");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `O formato de arquivo "${file.type}" não é permitido. Envie um PDF ou imagem (JPG, PNG, HEIC).`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `O tamanho do arquivo (${(file.size / 1024 / 1024).toFixed(1)} MB) excede o limite de 10 MB.`
    );
  }

  const ext = getExtension(file.type) || ".bin";
  const safeName = file.name || "document";
  const filename = `${randomUUID()}-${slugify(safeName)}${ext}`;
  const filePath = `despesas/${filename}`;

  const buffer = await file.arrayBuffer();

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Erro ao enviar arquivo para o Supabase: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("uploads")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Deletes a file from Supabase Storage given its public download URL.
 */
export async function deleteUploadedFile(fileUrl: string): Promise<void> {
  if (!fileUrl || !supabaseUrl || !supabaseKey) return;
  try {
    const urlObj = new URL(fileUrl);
    // Extrai o caminho do arquivo (ex: despesas/arquivo.png) do final da URL pública
    // Ex: .../storage/v1/object/public/uploads/despesas/arquivo.png
    const pathParts = urlObj.pathname.split("/public/uploads/");
    if (pathParts.length > 1) {
      const filePath = pathParts[1];
      const { error } = await supabase.storage
        .from("uploads")
        .remove([filePath]);
      if (error) {
        console.error("Falha ao deletar arquivo do Supabase Storage:", error);
      }
    }
  } catch (error: any) {
    console.error("Erro ao deletar arquivo do Supabase Storage:", error);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif"
  };
  return map[mimeType] ?? "";
}

function slugify(name: string): string {
  if (!name) return "file";
  return name
    .replace(/\.[^/.]+$/, "") // remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "file";
}
