import { apiFetch } from "@/lib/planner-api";

export interface TaskPageAttachment {
  id: string;
  task_id: string;
  filename: string;
  mime_type: string;
  kind: string;
  byte_size: number;
  has_text: boolean;
  created_at: string;
}

export interface StudyGuide {
  id: string;
  task_id: string;
  body_markdown: string;
  model: string;
  source_attachment_ids: string[];
  created_at: string;
}

export interface TaskPage {
  task_id: string;
  memo: string;
  attachments: TaskPageAttachment[];
  latest_study_guide: StudyGuide | null;
}

export async function fetchTaskPage(taskId: string): Promise<TaskPage> {
  return apiFetch<TaskPage>(`/api/v1/tasks/${taskId}/page`);
}

export async function updateTaskMemo(taskId: string, memo: string): Promise<TaskPage> {
  return apiFetch<TaskPage>(`/api/v1/tasks/${taskId}/page`, {
    method: "PATCH",
    body: JSON.stringify({ memo }),
  });
}

export async function uploadTaskAttachment(
  taskId: string,
  file: File,
): Promise<TaskPage> {
  const form = new FormData();
  form.append("file", file);
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ringo_token");
    if (token) headers["X-Ringo-Token"] = token;
  }
  const res = await fetch(`${base}/api/v1/tasks/${taskId}/attachments`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Upload failed ${res.status}`);
  }
  return res.json() as Promise<TaskPage>;
}

export async function generateStudyGuide(
  taskId: string,
  body: { lecture_topic?: string; extra_instructions?: string },
): Promise<{ study_guide: StudyGuide; chunks_used: number }> {
  return apiFetch(`/api/v1/tasks/${taskId}/study-guide/generate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function reviseStudyGuide(
  taskId: string,
  body: { instruction: string; task_title?: string },
): Promise<{ study_guide: StudyGuide }> {
  return apiFetch(`/api/v1/tasks/${taskId}/study-guide/revise`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function taskAttachmentDownloadUrl(taskId: string, attachmentId: string): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";
  return `${base}/api/v1/tasks/${taskId}/attachments/${attachmentId}/download`;
}

export async function downloadTaskAttachment(
  taskId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  const url = taskAttachmentDownloadUrl(taskId, attachmentId);
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ringo_token");
    if (token) headers["X-Ringo-Token"] = token;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export async function importStudyGuideFromChat(
  taskId: string,
  body: {
    markdown: string;
    model: string;
    chat_attachment_ids: string[];
  },
): Promise<TaskPage> {
  return apiFetch<TaskPage>(`/api/v1/tasks/${taskId}/page/from-chat`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function exportStudyGuidePdf(
  taskId: string,
  markdown: string,
  title: string,
): Promise<Blob> {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ringo_token");
    if (token) headers["X-Ringo-Token"] = token;
  }
  const res = await fetch(`${base}/api/v1/tasks/${taskId}/study-guide/export-pdf`, {
    method: "POST",
    headers,
    body: JSON.stringify({ markdown, title }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}
