export const STADIUM_MAP: Record<string, string> = {
  ALL: '全レース場',
  '01': '桐生',
  '02': '戸田',
  '03': '江戸川',
  '04': '平和島',
  '05': '多摩川',
  '06': '浜名湖',
  '07': '蒲郡',
  '08': '常滑',
  '09': '津',
  '10': '三国',
  '11': '琵琶湖',
  '12': '住之江',
  '13': '尼崎',
  '14': '鳴門',
  '15': '丸亀',
  '16': '児島',
  '17': '宮島',
  '18': '徳山',
  '19': '下関',
  '20': '若松',
  '21': '芦屋',
  '22': '福岡',
  '23': '唐津',
  '24': '大村',
};

export const STADIUM_OPTIONS = Object.entries(STADIUM_MAP).map(([value, label]) => ({
  value,
  label,
}));

export function customModelName(stadium: string): string {
  if (stadium === 'ALL') return 'custom_venue_全場';
  const label = STADIUM_MAP[stadium] || stadium;
  return `custom_venue_${label}`;
}

export function modelDisplayName(filename: string): string {
  const stem = filename.replace('.pkl', '');
  if (stem.startsWith('custom_venue_')) {
    return `自作（${stem.replace('custom_venue_', '')}）`;
  }
  return stem;
}
