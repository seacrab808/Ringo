import type { NaturalLanguageParseResponse } from "@/types/schedule";
import { apiFetch } from "@/lib/planner-api";

export interface ChatAttachmentUpload {
  id: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  has_text: boolean;
  preview: string;
}

export interface ChatSendResult {
  kind: "schedule" | "study_guide";
  parse?: NaturalLanguageParseResponse;
  parse_error?: string;
  study_guide_markdown?: string;
  study_guide_pdf_base64?: string;
  study_guide_model?: string;
  few_shot_used?: string[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ringo_token");
    if (token) headers["X-Ringo-Token"] = token;
  }
  return { ...headers, ...extra };
}

export async function uploadChatAttachment(file: File): Promise<ChatAttachmentUpload> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/chat/attachments`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Upload failed ${res.status}`);
  }
  return res.json() as Promise<ChatAttachmentUpload>;
}

export async function sendChatMessage(body: {
  text: string;
  attachment_ids: string[];
  reference_date?: string;
  mode?: "auto" | "schedule" | "study_guide";
}): Promise<ChatSendResult> {
  return apiFetch<ChatSendResult>("/api/v1/chat/send", {
    method: "POST",
    body: JSON.stringify({
      timezone: "Asia/Seoul",
      mode: "auto",
      ...body,
    }),
  });
}

export function downloadPdfBase64(base64: string, filename: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
