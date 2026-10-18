import type { Feature } from 'geojson';

export function publishedFeatureColor(properties: Record<string, unknown>, fallback: string) {
  return typeof properties.route_color === 'string' && /^[0-9a-f]{6}$/i.test(properties.route_color)
    ? `#${properties.route_color}` : fallback;
}

// Published properties are text, never HTML. Do not infer current service dates
// or source links from the local catalog or from a layer's arbitrary identity.
export function appendPublishedDetails(element: HTMLElement, feature: Feature) {
  const document = element.ownerDocument;
  const p = feature.properties || {};
  const add = (label: string, value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    if (value === '') return;
    const line = document.createElement('p'); line.textContent = `${label}${value}`; element.append(line);
  };
  for (const [key, label] of Object.entries({ fulladd: '', schoolType: 'Type: ', recordStatus: 'Record status: ',
    DistrictID: 'District: ', BoardMember: 'Board member: ', planLabel: '', boundaryVintage: 'Boundary version: ',
    geometryNote: '', originalDescription: '', stop_code: 'Stop: ', stop_id: 'Stop ID: ', variantCount: 'Route-path variants: ',
    attribution: 'Source: ', sourceChecked: 'Checked: ' })) add(label, p[key]);
  for (const [key, label] of Object.entries({ routeNumbers: 'Scheduled route: ', routeNames: '', directions: 'Direction: ' })) {
    if (Array.isArray(p[key])) for (const value of p[key]) add(label, value);
  }
  if (p.routeNumbers || p.routeNames || p.route_color || p.stop_id) add('', 'Saved schedule snapshot; live arrivals and service disruptions are not included. Confirm current service with the original source.');
  if (p.wheelchair_boarding !== undefined) add('Wheelchair boarding: ', ({ '0': 'Not specified in source', '1': 'Accessible boarding', '2': 'Boarding is not wheelchair accessible' } as Record<string, string>)[String(p.wheelchair_boarding)] || 'Not specified in source');
  if (Array.isArray(p.events)) for (const event of p.events) {
    if (typeof event?.id !== 'string' || typeof event?.title !== 'string') continue;
    const line = document.createElement('p'); const link = document.createElement('a');
    link.href = `/calendar/?event=${encodeURIComponent(event.id)}`; link.textContent = event.title; line.append(link); element.append(line);
  }
  if (typeof p.sourceUrl === 'string') {
    try {
      const url = new URL(p.sourceUrl);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        const line = document.createElement('p'); const link = document.createElement('a');
        link.href = p.sourceUrl; link.textContent = 'Open the original source'; line.append(link); element.append(line);
      }
    } catch { /* Invalid source URLs remain noninteractive. */ }
  }
}
