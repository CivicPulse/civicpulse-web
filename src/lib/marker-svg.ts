const validColor = (value: string | undefined, fallback: string) => value && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
export function renderMarkerSvg(template: string, colors: string[], border: string, fallback: string) {
  const fills = [...new Set(colors.map(value => validColor(value, fallback)))];
  if (!fills.length) fills.push(fallback);
  const slices = fills.length < 2 ? '' : fills.map((fill, index) => {
    const angle = (step: number) => -Math.PI / 2 + 2 * Math.PI * step / fills.length;
    const point = (step: number) => `${32 + 28 * Math.cos(angle(step))} ${30 + 28 * Math.sin(angle(step))}`;
    return `<path d="M32 30 L${point(index)} A28 28 0 0 1 ${point(index + 1)} Z" fill="${fill}"/>`;
  }).join('');
  return template.replace(/--marker-fill:#[\da-f]{6}/i, `--marker-fill:${fills[0]}`)
    .replace(/--marker-border:#[\da-f]{6}/i, `--marker-border:${validColor(border, '#000000')}`)
    .replace('<g id="calendar-colors" clip-path="url(#pin-clip)"></g>', `<g clip-path="url(#pin-clip)">${slices}</g>`);
}
