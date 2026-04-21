export type AlarmSystemTab = 'system-details' | 'zones' | 'emergency-contacts' | 'code-words' | 'call-history' | 'history' | 'photos' | 'documents';

export interface AlarmSystemTabConfig {
  id: AlarmSystemTab;
  label: string;
  icon: string;
}
