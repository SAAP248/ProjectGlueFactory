import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { DocumentCategory } from './types';

export function useDocumentCategories() {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from('document_categories')
      .select('*')
      .order('name');
    if (data) setCategories(data as DocumentCategory[]);
  }

  async function createCategory(name: string, color: string): Promise<DocumentCategory | null> {
    const { data } = await supabase
      .from('document_categories')
      .insert({ name, color })
      .select()
      .maybeSingle();
    if (data) {
      setCategories(prev => [...prev, data as DocumentCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return data as DocumentCategory;
    }
    return null;
  }

  return { categories, createCategory, reloadCategories: loadCategories };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toUpperCase() ?? 'FILE';
}

export function fileTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('docx')) return 'WORD';
  if (mimeType.includes('excel') || mimeType.includes('xlsx') || mimeType.includes('spreadsheet')) return 'EXCEL';
  if (mimeType.includes('powerpoint') || mimeType.includes('pptx') || mimeType.includes('presentation')) return 'PPT';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.includes('text')) return 'TEXT';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'ZIP';
  return 'FILE';
}

export function fileTypeColor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'bg-red-100 text-red-700';
  if (mimeType.includes('word') || mimeType.includes('docx')) return 'bg-blue-100 text-blue-700';
  if (mimeType.includes('excel') || mimeType.includes('xlsx') || mimeType.includes('spreadsheet')) return 'bg-green-100 text-green-700';
  if (mimeType.includes('powerpoint') || mimeType.includes('pptx')) return 'bg-orange-100 text-orange-700';
  if (mimeType.startsWith('image/')) return 'bg-teal-100 text-teal-700';
  if (mimeType.includes('text')) return 'bg-gray-100 text-gray-700';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}
