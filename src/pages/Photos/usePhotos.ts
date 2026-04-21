import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Photo, PhotoLabel, PhotoUploadContext, PhotoGalleryFilters } from './types';

export function usePhotoLabels() {
  const [labels, setLabels] = useState<PhotoLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('photo_labels').select('*').order('name');
    if (data) setLabels(data as PhotoLabel[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createLabel(name: string, color: string): Promise<PhotoLabel | null> {
    const { data } = await supabase
      .from('photo_labels')
      .insert({ name: name.trim(), color })
      .select()
      .maybeSingle();
    if (data) {
      setLabels(prev => [...prev, data as PhotoLabel].sort((a, b) => a.name.localeCompare(b.name)));
      return data as PhotoLabel;
    }
    return null;
  }

  async function updateLabel(id: string, name: string, color: string) {
    await supabase.from('photo_labels').update({ name, color }).eq('id', id);
    setLabels(prev => prev.map(l => l.id === id ? { ...l, name, color } : l));
  }

  async function deleteLabel(id: string) {
    await supabase.from('photo_labels').delete().eq('id', id);
    setLabels(prev => prev.filter(l => l.id !== id));
  }

  return { labels, loading, createLabel, updateLabel, deleteLabel, reload: load };
}

export function usePhotos(context: PhotoUploadContext, filters: PhotoGalleryFilters) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('photos')
      .select('*, photo_label_assignments(label_id, photo_labels(id, name, color))')
      .order('taken_at', { ascending: false });

    if (context.systemId) {
      query = query.eq('system_id', context.systemId);
    } else if (context.siteId) {
      query = query.eq('site_id', context.siteId);
    } else if (context.companyId) {
      query = query.eq('company_id', context.companyId);
    }

    if (filters.showPortalOnly) query = query.eq('show_in_portal', true);
    if (filters.dateFrom) query = query.gte('taken_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('taken_at', filters.dateTo + 'T23:59:59');

    const { data } = await query;
    if (data) {
      let mapped = (data as any[]).map(p => ({
        ...p,
        labels: (p.photo_label_assignments || []).map((a: any) => a.photo_labels).filter(Boolean),
      })) as Photo[];

      if (filters.search) {
        const q = filters.search.toLowerCase();
        mapped = mapped.filter(p =>
          p.caption?.toLowerCase().includes(q) ||
          p.uploaded_by?.toLowerCase().includes(q) ||
          p.labels?.some((l: PhotoLabel) => l.name.toLowerCase().includes(q))
        );
      }

      if (filters.labelIds.length > 0) {
        mapped = mapped.filter(p =>
          filters.labelIds.every(lid => p.labels?.some((l: PhotoLabel) => l.id === lid))
        );
      }

      setPhotos(mapped);
    }
    setLoading(false);
  }, [context.companyId, context.siteId, context.systemId, filters.search, filters.labelIds, filters.showPortalOnly, filters.dateFrom, filters.dateTo]);

  useEffect(() => { load(); }, [load]);

  async function uploadPhoto(
    file: File,
    ctx: PhotoUploadContext,
    uploadedBy: string,
    caption: string | null,
    labelIds: string[]
  ): Promise<Photo | null> {
    let fileUrl = '';
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `site-photos/${ctx.companyId ?? 'general'}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('site-photos')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        fileUrl = await toDataUrl(file);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(path);
        fileUrl = publicUrl;
      }
    } catch {
      fileUrl = await toDataUrl(file);
    }

    const { data: photo } = await supabase
      .from('photos')
      .insert({
        file_url: fileUrl,
        caption: caption || null,
        company_id: ctx.companyId || null,
        site_id: ctx.siteId || null,
        system_id: ctx.systemId || null,
        uploaded_by: uploadedBy || 'Unknown',
        taken_at: new Date().toISOString(),
        show_in_portal: false,
      })
      .select()
      .maybeSingle();

    if (!photo) return null;

    if (labelIds.length > 0) {
      await supabase.from('photo_label_assignments').insert(
        labelIds.map(lid => ({ photo_id: photo.id, label_id: lid }))
      );
    }

    await load();
    return photo as Photo;
  }

  async function deletePhoto(id: string) {
    await supabase.from('photos').delete().eq('id', id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  async function updatePhoto(id: string, updates: { caption?: string | null; show_in_portal?: boolean; labelIds?: string[] }) {
    const { caption, show_in_portal, labelIds } = updates;
    const patch: Record<string, any> = {};
    if (caption !== undefined) patch.caption = caption;
    if (show_in_portal !== undefined) patch.show_in_portal = show_in_portal;

    if (Object.keys(patch).length > 0) {
      await supabase.from('photos').update(patch).eq('id', id);
    }

    if (labelIds !== undefined) {
      await supabase.from('photo_label_assignments').delete().eq('photo_id', id);
      if (labelIds.length > 0) {
        await supabase.from('photo_label_assignments').insert(
          labelIds.map(lid => ({ photo_id: id, label_id: lid }))
        );
      }
    }

    await load();
  }

  return { photos, loading, uploadPhoto, deletePhoto, updatePhoto, reload: load };
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function groupPhotosByDate(photos: Photo[]): { dateLabel: string; photos: Photo[] }[] {
  const groups: Record<string, Photo[]> = {};
  for (const photo of photos) {
    const d = new Date(photo.taken_at);
    const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(photo);
  }
  return Object.entries(groups).map(([dateLabel, photos]) => ({ dateLabel, photos }));
}
