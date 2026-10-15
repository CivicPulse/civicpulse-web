import type { Feature } from 'geojson';
import { transitServicePeriod, transitFeedExpired } from '../data/education-transit';
export function appendOfficialDetails(element: HTMLElement, feature: Feature, source: string) {
  const p = feature.properties || {};
  const add = (value: string) => { const line = document.createElement('p'); line.textContent = value; element.append(line); };
  const link = (label: string, url: string) => { const line = document.createElement('p'); const anchor = document.createElement('a'); anchor.textContent = label; anchor.href = url; line.append(anchor); element.append(line); };
  if (source === 'rapid-service-area') {
    add('On-demand rideshare service area. Both pickup and destination must be within active Rapid service zones.');
    add('Published boundary snapshot; confirm availability with MBCTA Rapid before booking.');
    if (p.originalDescription) add(`Original map annotation: ${p.originalDescription}`);
  } else if (source === 'schools' || source.startsWith('schools-')) {
    if (p.fulladd) add(p.fulladd);
    if (p.schoolType) add(`Type in source: ${p.schoolType}`);
    if (p.recordStatus) add(`Record status: ${p.recordStatus}`);
  } else if (source === 'school-board-districts') {
    add(`Geographic district: ${p.DistrictID || p.DISTRICT}`);
    if (p.BoardMember) add(`Board member in source: ${p.BoardMember}`);
  } else if (source.startsWith('school-zones-')) {
    add('Source school year: 2025–26.');
    add('These are published attendance boundaries. Confirm your current enrollment assignment with BCSD.');
  } else if (source === 'transit-routes') {
    add(`${p.variantCount} route-path variants in the schedule.`);
    for (const direction of p.directions || []) add(`Direction: ${direction}`);
    add(`Schedule coverage: ${transitServicePeriod}.`);
  } else if (source === 'transit-stops') {
    add(`Stop ${p.stop_code || p.stop_id}`);
    add(p.routeNumbers?.length ? `Scheduled routes: ${p.routeNumbers.join(', ')}` : 'No trips serve this stop in the saved schedule.');
    for (const route of p.routeNames || []) add(route);
    const accessible = { '0': 'Not specified in source', '1': 'Accessible boarding', '2': 'Boarding is not wheelchair accessible' };
    add(`Wheelchair boarding: ${accessible[String(p.wheelchair_boarding) as keyof typeof accessible] || 'Not specified in source'}`);
    add(`Schedule coverage: ${transitServicePeriod}.`);
  }
  if (source === 'rapid-service-area') {
    link('MBCTA Rapid service information', 'https://rapid.mbcta.net/');
    link('View the authority’s service-area map', 'https://www.google.com/maps/d/viewer?mid=1XRJZHA2YN6PVYQcTneJiPw_QS1S6g9E');
  } else if (source.startsWith('transit-')) {
    add(transitFeedExpired() ? 'This schedule snapshot has expired. Check the authority for current service.' : 'Saved schedule snapshot; live arrivals and service disruptions are not included.');
    link('Official routes and schedules', 'https://mbcta.net/routes/');
    link('Live bus information', 'https://myride.mbcta.net/');
  } else link('BCSD school and zone maps', 'https://www.bcsdk12.net/about-us');
  add(`Source: ${p.attribution}. Checked ${p.sourceChecked}.`);
}
