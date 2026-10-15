// Stable district colors shared by the map, directory, and layer legend.
export const commissionColors: Record<string, string> = {
  '1': '#2166ac',
  '2': '#e66101',
  '3': '#1b9e77',
  '4': '#c51b7d',
  '5': '#e6ab02',
  '6': '#6a51a3',
  '7': '#5a5a5a',
  '8': '#8c510a',
  '9': '#00a6ca',
};

export function commissionColor(district: unknown): string {
  return commissionColors[String(district)] || '#4d6a8c';
}
