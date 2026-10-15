import { events, eventDate } from '../lib/events';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const grid = byId('calendar-grid');
const query = byId<HTMLInputElement>('event-search');
const category = byId<HTMLSelectElement>('event-category');
const clearDay = byId<HTMLButtonElement>('clear-day');
const articles = [...document.querySelectorAll<HTMLElement>('.calendar-event')];
const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const today = todayKey.split('-').map(Number);
let year = today[0], month = today[1] - 1;
let selectedDay: number | null = null;
let view = 'month';
const eventParam = new URLSearchParams(location.search).get('event');
const focused = events.find(event => event.id === eventParam);
if (focused) { year = Number(focused.start.slice(0, 4)); month = Number(focused.start.slice(5, 7)) - 1; selectedDay = Number(focused.start.slice(8, 10)); }
const key = (day?: number) => `${year}-${String(month + 1).padStart(2, '0')}${day ? '-' + String(day).padStart(2, '0') : ''}`;
function matching() {
  const search = query.value.trim().toLocaleLowerCase();
  return events.filter(event => event.start.startsWith(key()) && (category.value === 'all' || event.category === category.value) && `${event.title} ${event.location} ${event.description}`.toLocaleLowerCase().includes(search));
}
function render() {
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1)));
  byId('month-title').textContent = monthLabel;
  const matched = matching();
  const shown = matched.filter(event => selectedDay === null || event.start.startsWith(key(selectedDay)));
  const shownIds = new Set(shown.map(event => event.id));
  for (const article of articles) article.hidden = !shownIds.has(article.dataset.event!);
  const heading = selectedDay === null ? `Events in ${monthLabel}` : `Events on ${eventDate(key(selectedDay) + 'T12:00:00-05:00', { month: 'long', day: 'numeric' })}`;
  byId('list-heading').textContent = heading;
  byId('event-count').textContent = `${shown.length} ${shown.length === 1 ? 'sample event' : 'sample events'}${query.value.trim() ? ` matching “${query.value.trim()}”` : ''}`;
  byId('events-empty').hidden = shown.length > 0;
  byId('empty-explanation').textContent = selectedDay !== null ? 'No matching sample events on this day. Choose another day or show the whole month.' : 'Try another month, search term, or category. Sample events are available October–December 2026.';
  clearDay.hidden = selectedDay === null;
  byId('month-view').hidden = view !== 'month';
  byId('agenda-summary').hidden = view !== 'agenda';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === view));
  grid.replaceChildren();
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let i = 0; i < firstDay; i++) { const spacer = document.createElement('span'); spacer.setAttribute('aria-hidden', 'true'); grid.append(spacer); }
  for (let day = 1; day <= total; day++) {
    const dayKey = key(day);
    const onDay = matched.filter(event => event.start.startsWith(dayKey));
    const button = document.createElement('button'); button.type = 'button'; button.className = 'day-cell';
    button.setAttribute('aria-pressed', String(selectedDay === day));
    button.setAttribute('aria-label', `${eventDate(dayKey + 'T12:00:00-05:00', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${onDay.length} sample ${onDay.length === 1 ? 'event' : 'events'}`);
    if (dayKey === todayKey) { button.classList.add('is-today'); button.setAttribute('aria-current', 'date'); }
    const number = document.createElement('span'); number.className = 'day-number'; number.textContent = String(day); button.append(number);
    if (onDay.length) { button.classList.add('has-events'); const dot = document.createElement('span'); dot.className = 'event-dot'; dot.setAttribute('aria-hidden', 'true'); button.append(dot); }
    button.addEventListener('click', () => { selectedDay = selectedDay === day ? null : day; render(); grid.querySelector<HTMLButtonElement>(`[aria-label^="${eventDate(dayKey + 'T12:00:00-05:00', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}"]`)?.focus(); });
    grid.append(button);
  }
}
function shift(amount: number) {
  const date = new Date(Date.UTC(year, month + amount, 1)); year = date.getUTCFullYear(); month = date.getUTCMonth(); selectedDay = null; render();
}
byId('previous-month').addEventListener('click', () => shift(-1));
byId('next-month').addEventListener('click', () => shift(1));
byId('today').addEventListener('click', () => { year = today[0]; month = today[1] - 1; selectedDay = null; render(); });
clearDay.addEventListener('click', () => { selectedDay = null; render(); });
query.addEventListener('input', render);
category.addEventListener('change', render);
byId('reset-filters').addEventListener('click', () => { query.value = ''; category.value = 'all'; selectedDay = null; render(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => { view = button.dataset.view!; selectedDay = null; render(); });
render();
if (focused) { const article = byId(`event-${focused.id}`); article.querySelector('details')!.open = true; article.scrollIntoView({ block: 'center' }); }
