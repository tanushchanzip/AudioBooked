import type { Project, Chapter, TextTiming, HardwareInfo, VoicesResponse, LibraryStats, AIProvidersResponse, AICondenseRequest, AICondenseResponse, CustomVoiceItem, CreateCustomVoicePayload, PreviewCustomVoicePayload } from './types';

export class ApiClient {
  static async getProjects(): Promise<Project[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  }

  static async getProject(id: string): Promise<Project> {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) throw new Error('Project not found');
    return res.json();
  }

  static async getHardwareInfo(): Promise<HardwareInfo> {
    const res = await fetch('/api/hardware');
    if (!res.ok) throw new Error('Failed to fetch hardware status');
    return res.json();
  }

  static async getVoices(): Promise<VoicesResponse> {
    const res = await fetch('/api/voices');
    if (!res.ok) throw new Error('Failed to load voices');
    return res.json();
  }

  static async getCustomVoices(): Promise<CustomVoiceItem[]> {
    const res = await fetch('/api/custom-voices');
    if (!res.ok) throw new Error('Failed to load custom voices');
    return res.json();
  }

  static async createCustomVoice(payload: CreateCustomVoicePayload): Promise<CustomVoiceItem> {
    const res = await fetch('/api/custom-voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create custom voice' }));
      throw new Error(err.detail || 'Failed to create custom voice');
    }
    return res.json();
  }

  static async deleteCustomVoice(voiceId: string): Promise<void> {
    const res = await fetch(`/api/custom-voices/${encodeURIComponent(voiceId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete custom voice');
  }

  static async previewCustomVoice(payload: PreviewCustomVoicePayload): Promise<string> {
    const res = await fetch('/api/custom-voices/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate preview audio');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  static async updateSettings(id: string, settings: Partial<Project>): Promise<void> {
    const res = await fetch(`/api/projects/${id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to save settings');
  }

  static async generate(id: string, chapterIds?: string[]): Promise<void> {
    const res = await fetch(`/api/projects/${id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_ids: chapterIds || null }),
    });
    if (!res.ok) throw new Error('Failed to start synthesis');
  }

  static async exportM4b(id: string): Promise<{ m4b_path: string }> {
    const res = await fetch(`/api/projects/${id}/export/m4b`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to package M4B container');
    return res.json();
  }

  static async reindexChapters(id: string): Promise<{ updated_chapters: Array<{ id: string; old_title: string; new_title: string; new_index: number }> }> {
    const res = await fetch(`/api/projects/${id}/reindex-chapters`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reindex chapters');
    return res.json();
  }

  static async getChapterTimings(chapterId: string): Promise<TextTiming[]> {
    const res = await fetch(`/api/chapters/${chapterId}/timings`);
    if (!res.ok) return [];
    return res.json();
  }

  static async ingestBatchLinks(urls: string[], title?: string, author?: string): Promise<{ project_id: string; title: string }> {
    const res = await fetch('/api/ingest/batch-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, title: title || undefined, author: author || undefined }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Batch link ingestion failed');
    return data;
  }

  static async previewUrlSequence(url: string, start?: number, end?: number, count?: number): Promise<{
    status: string;
    detected_chapter: number | null;
    start: number;
    end: number;
    count: number;
    urls: string[];
  }> {
    const res = await fetch('/api/ingest/sequence-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, start, end, count }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'URL sequence preview failed');
    return data;
  }

  static async appendChaptersToProject(projectId: string, urls: string[]): Promise<{
    status: string;
    project_id: string;
    added_count: number;
    total_chapters: number;
  }> {
    const res = await fetch(`/api/projects/${projectId}/append-chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to append chapters');
    return data;
  }

  static async ingestArticle(url: string): Promise<{ project_id: string }> {
    const res = await fetch('/api/ingest/article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Article ingestion failed');
    return data;
  }

  static async uploadFile(formData: FormData): Promise<{ project_id: string }> {
    const res = await fetch('/api/ingest/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'File upload failed');
    return data;
  }

  static async openRootFolder(): Promise<void> {
    await fetch('/api/open-root-folder', { method: 'POST' });
  }

  static async addGlossaryRule(projectId: string, term: string, replacement: string): Promise<void> {
    const res = await fetch(`/api/projects/${projectId}/glossary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, replacement }),
    });
    if (!res.ok) throw new Error('Failed to add glossary rule');
  }

  static async deleteGlossaryRule(ruleId: string): Promise<void> {
    const res = await fetch(`/api/glossary/${ruleId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete glossary rule');
  }

  static async getLibraryStats(): Promise<LibraryStats> {
    const res = await fetch('/api/library/stats');
    if (!res.ok) throw new Error('Failed to fetch library stats');
    return res.json();
  }

  static async updateProject(id: string, updates: Partial<Project>): Promise<{ status: string; project: Project }> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update project metadata');
    return res.json();
  }

  static async deleteProject(id: string, deleteFiles: boolean = true): Promise<void> {
    const res = await fetch(`/api/projects/${id}?delete_files=${deleteFiles}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
  }

  static async batchDeleteProjects(ids: string[], deleteFiles: boolean = true): Promise<void> {
    const res = await fetch('/api/projects/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_ids: ids, delete_files: deleteFiles }),
    });
    if (!res.ok) throw new Error('Failed to delete selected projects');
  }

  static async openProjectFolder(id: string): Promise<void> {
    const res = await fetch(`/api/projects/${id}/open-folder`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to open project folder');
  }

  static async uploadCover(id: string, file: File): Promise<{ status: string; cover_image: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/projects/${id}/cover`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload cover' }));
      throw new Error(err.detail || 'Failed to upload cover');
    }
    return res.json();
  }

  static async mergeProjects(params: {
    target_project_id: string;
    source_project_ids: string[];
    new_title?: string;
    new_author?: string;
    strategy?: 'smart_sort' | 'append';
    deduplicate?: boolean;
    delete_sources?: boolean;
  }): Promise<{
    status: string;
    target_project_id: string;
    title: string;
    total_chapters: number;
    completed_chapters: number;
    deduplicated_count: number;
  }> {
    const res = await fetch('/api/projects/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to merge projects');
    return data;
  }

  static async getAIProviders(): Promise<AIProvidersResponse> {
    const res = await fetch('/api/ai/providers');
    if (!res.ok) throw new Error('Failed to fetch AI providers');
    return res.json();
  }

  static async saveAISettings(settings: {
    provider: string;
    api_key?: string;
    model?: string;
    focus_mode?: string;
    detail_level?: string;
  }): Promise<void> {
    const res = await fetch('/api/ai/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to save AI settings');
    }
  }

  static async condenseChapters(req: AICondenseRequest): Promise<AICondenseResponse> {
    const res = await fetch('/api/ai/condense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'AI Condensation failed');
    return data;
  }
}

