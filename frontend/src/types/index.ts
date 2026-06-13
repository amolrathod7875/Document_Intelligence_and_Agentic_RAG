export interface Citation {
  document_name: string;
  page_number: number;
  image_path: string; // Relative static link pointing to backend /static/thumbnails/
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface FileStatus {
  status: 'parsing' | 'classifying' | 'indexing' | 'indexed' | 'failed';
  details: string;
  document_type?: string;
  sensitivity_level?: string;
}

export interface UploadStatusMap {
  [filename: string]: FileStatus;
}