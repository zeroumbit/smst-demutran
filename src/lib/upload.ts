export function sanitizeFileName(fileName: string): string {
  const extension = fileName.match(/\.[^.]+$/)?.[0] || '';
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${sanitized}_${Date.now()}${extension.toLowerCase()}`;
}

type UploadValidationOptions = {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeInBytes: number;
  label?: string;
};

export function validateFileUpload(file: File, options: UploadValidationOptions): void {
  const {
    allowedMimeTypes,
    allowedExtensions,
    maxSizeInBytes,
    label = 'arquivo',
  } = options;

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';

  if (!allowedMimeTypes.includes(file.type) || !allowedExtensions.includes(extension)) {
    throw new Error(`Formato de ${label} invalido.`);
  }

  if (file.size > maxSizeInBytes) {
    throw new Error(`O ${label} excede o tamanho maximo permitido.`);
  }
}

export const IMAGE_UPLOAD_RULES = {
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
  maxSizeInBytes: 5 * 1024 * 1024,
  label: 'imagem',
} as const;

export const DOCUMENT_UPLOAD_RULES = {
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  maxSizeInBytes: 10 * 1024 * 1024,
  label: 'documento',
} as const;

export const PDF_UPLOAD_RULES = {
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
  maxSizeInBytes: 10 * 1024 * 1024,
  label: 'arquivo PDF',
} as const;
