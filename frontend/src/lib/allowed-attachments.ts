export const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".ppt", ".pptx"] as const;

export const ALLOWED_ATTACHMENT_ACCEPT =
  ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export const ALLOWED_ATTACHMENT_LABEL = "PDF · PPT";

export function isAllowedAttachment(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function filterAllowedAttachments(files: File[]): File[] {
  return files.filter(isAllowedAttachment);
}
