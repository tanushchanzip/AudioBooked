export interface Chapter {
  id: string;
  project_id: string;
  chapter_index: number;
  title: string;
  content: string;
  audio_file?: string | null;
  duration?: number;
  status: 'pending' | 'synthesizing' | 'completed' | 'failed';
  progress: number;
  timings_json?: string | null;
}

export interface GlossaryItem {
  id: string;
  project_id?: string | null;
  term: string;
  replacement: string;
}

export interface Project {
  id: string;
  title: string;
  author: string;
  source_type: string;
  source_url?: string;
  cover_image?: string | null;
  narrator_voice: string;
  dialogue_voice: string;
  thought_voice: string;
  speed: number;
  thought_speed: number;
  status: 'draft' | 'processing' | 'completed' | 'partial';
  output_m4b?: string | null;
  created_at: string;
  chapter_count?: number;
  completed_chapters?: number;
  total_duration?: number;
  chapters?: Chapter[];
  glossary?: GlossaryItem[];
}

export interface TextTiming {
  id: number;
  start: number;
  end: number;
  text: string;
  type: 'narrator' | 'dialogue' | 'thought' | string;
  voice: string;
}

export interface HardwareInfo {
  device: string;
  use_gpu: boolean;
  sample_rate: number;
  total_voices: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'custom' | string;
  accent: string;
  language: string;
  role: 'narrator' | 'dialogue' | 'thought' | 'character';
  tags: string[];
  description: string;
  sample_quote: string;
  is_custom?: boolean;
  base_voice?: string;
  blend_voice?: string;
  blend_ratio?: number;
  expression?: string;
}

export interface CustomVoiceItem {
  id: string;
  name: string;
  base_voice: string;
  blend_voice: string;
  blend_ratio: number;
  expression: string;
  description?: string;
  created_at?: string;
}

export interface CreateCustomVoicePayload {
  name: string;
  base_voice: string;
  blend_voice: string;
  blend_ratio: number;
  description?: string;
}

export interface PreviewCustomVoicePayload {
  base_voice: string;
  blend_voice: string;
  blend_ratio: number;
  text?: string;
  speed?: number;
}

export interface VoicesResponse {
  voices: string[];
  recommended: {
    narrator: string[];
    dialogue: string[];
    thought: string[];
    custom?: string[];
  };
  custom_voices?: CustomVoiceItem[];
  details?: Record<string, VoiceInfo>;
}

export interface LibraryStats {
  total_books: number;
  total_chapters: number;
  completed_chapters: number;
  total_duration_seconds: number;
  formatted_duration: string;
  disk_bytes: number;
  formatted_disk_size: string;
}

export interface AIProviderInfo {
  name: string;
  default_model: string;
  models: string[];
  key_url: string;
  description: string;
  has_key?: boolean;
  masked_key?: string;
  saved_base_url?: string;
}

export interface AIProvidersResponse {
  providers: Record<string, AIProviderInfo>;
  current_provider: string;
  current_model: string;
  current_focus_mode: string;
  current_detail_level: string;
}

export interface AICondenseRequest {
  project_id: string;
  start_index: number;
  end_index: number;
  focus_mode: 'romcom' | 'balanced' | 'action';
  detail_level: 'brief' | 'standard' | 'detailed';
  custom_instructions?: string;
  provider?: string;
  api_key?: string;
  model?: string;
  base_url?: string;
  save_key?: boolean;
  output_action?: 'create_chapter' | 'preview_only' | 'new_book';
}

export interface AICondenseResponse {
  status: string;
  title: string;
  content: string;
  original_chapters_count: number;
  valid_chapters_count: number;
  original_chars: number;
  condensed_chars: number;
  compression_ratio_pct: number;
  focus_mode: string;
  provider: string;
  model: string;
  created_chapter_id?: string;
  chapter_index?: number;
  new_project_id?: string;
}


