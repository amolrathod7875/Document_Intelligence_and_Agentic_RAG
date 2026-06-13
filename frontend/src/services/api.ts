const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const api = {
  async uploadFiles(files: File[]): Promise<{ message: string; files: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${BACKEND_URL}/api/upload/bulk`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Bulk upload failed.');
    return response.json();
  },

  async getUploadStatus(): Promise<Record<string, any>> {
    const response = await fetch(`${BACKEND_URL}/api/upload/status`);
    if (!response.ok) throw new Error('Failed to retrieve processing metrics.');
    return response.json();
  },

  async sendChatMessage(query: string, history: Array<{ role: string; content: string }>) {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history }),
    });
    if (!response.ok) throw new Error('Network error during synthesis.');
    return response.json();
  },

  getThumbnailUrl(relativePath: string): string {
    // Strips out backend internal text formatting layers to resolve asset links cleanly
    const fileName = relativePath.split('/').pop();
    return `${BACKEND_URL}/static/thumbnails/${fileName}`;
  }
};