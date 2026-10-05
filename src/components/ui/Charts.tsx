'use client';

// Gráficos em SVG puro, no padrão do DS SC: barras finas (até 24 px) com ponta arredondada, grade discreta,
// tooltip ao passar o mouse e tabela para leitores de tela. Série única usa a cor da clínica;
// comparação de duas séries usa o par validado azul/laranja (legível também para daltônicos).
import { useEffect, useRef, useState } from 'react';

export const SERIES = { first: '#2a78d6', second: '#eb6834' };

type Point = { label: string; tooltip?: string; values: number[] };
type Series = { name: string; color: string };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// Escala "redonda": 0, 1.000, 2.000… para a grade.
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find(item => item * power >= value / 1) || 10;
  return step * power;
}

// Coluna com ponta de 4 px arredondada e base reta, crescendo da linha de base.
function columnPath(x: number, y: number, width: number, height: number): string {
  if (height <= 0) return '';
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

export function ColumnChart({ points, series, format, height = 200, ariaLabel, labelEvery = 1 }: {
  points: Point[];
  series: Series[];
  format: (value: number) => string;
  height?: number;
  ariaLabel: string;
  labelEvery?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const left = 56;
  const bottom = 24;
  const top = 8;
  const plotWidth = Math.max(0, width - left - 4);
  const plotHeight = height - bottom - top;
  const max = niceMax(Math.max(0, ...points.flatMap(point => point.values)));
  const band = points.length ? plotWidth / points.length : 0;
  const gap = 2;
  const barWidth = Math.max(2, Math.min(24, (band * 0.7 - gap * (series.length - 1)) / series.length));
  const groupWidth = barWidth * series.length + gap * (series.length - 1);
  const ticks = [0, 0.5, 1].map(ratio => ratio * max);
  const active = hover !== null ? points[hover] : null;

  return (
    <figure className="z-chart" aria-label={ariaLabel}>
      {series.length > 1 && (
        <figcaption className="z-chart-legend">
          {series.map(item => <span key={item.name}><i style={{ background: item.color }} aria-hidden="true" />{item.name}</span>)}
        </figcaption>
      )}
      <div ref={ref} className="z-chart-plot" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-hidden="true">
            {ticks.map(tick => {
              const y = top + plotHeight - (tick / max) * plotHeight;
              return (
                <g key={tick}>
                  <line x1={left} x2={width} y1={y} y2={y} className="z-chart-grid" />
                  <text x={left - 8} y={y + 4} textAnchor="end" className="z-chart-tick">{format(tick)}</text>
                </g>
              );
            })}
            {points.map((point, index) => {
              const x0 = left + band * index + (band - groupWidth) / 2;
              return (
                <g key={point.label} onMouseEnter={() => setHover(index)}>
                  <rect x={left + band * index} y={top} width={band} height={plotHeight + bottom} fill="transparent" />
                  {hover === index && <rect x={left + band * index} y={top} width={band} height={plotHeight} className="z-chart-hover" />}
                  {point.values.map((value, serie) => {
                    const h = (value / max) * plotHeight;
                    return <path key={serie} d={columnPath(x0 + serie * (barWidth + gap), top + plotHeight - h, barWidth, h)} fill={series[serie].color} />;
                  })}
                  {(index % labelEvery === 0 || index === points.length - 1) && (
                    <text x={left + band * index + band / 2} y={height - 6} textAnchor="middle" className="z-chart-tick">{point.label}</text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {active && hover !== null && (
          <div className="z-chart-tip" style={{ left: Math.min(Math.max(left + band * hover + band / 2, 70), width - 70) }}>
            <strong>{active.tooltip || active.label}</strong>
            {series.map((item, serie) => <span key={item.name}><i style={{ background: item.color }} aria-hidden="true" />{series.length > 1 ? `${item.name}: ` : ''}{format(active.values[serie])}</span>)}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead><tr><th>Período</th>{series.map(item => <th key={item.name}>{item.name}</th>)}</tr></thead>
        <tbody>{points.map(point => <tr key={point.label}><td>{point.tooltip || point.label}</td>{point.values.map((value, serie) => <td key={serie}>{format(value)}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  );
}

// Barras horizontais com o valor na ponta: bom para ranking (ex.: receita por atendimento).
export function BarList({ items, format, ariaLabel }: { items: { label: string; value: number; note?: string }[]; format: (value: number) => string; ariaLabel: string }) {
  const max = Math.max(0, ...items.map(item => item.value)) || 1;
  return (
    <ul className="z-barlist" aria-label={ariaLabel}>
      {items.map(item => (
        <li key={item.label} title={item.note ? `${item.label}: ${format(item.value)} · ${item.note}` : undefined}>
          <span className="z-barlist-label">{item.label}{item.note && <small className="t-muted">{item.note}</small>}</span>
          <span className="z-barlist-track"><span className="z-barlist-bar" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} /></span>
          <span className="z-barlist-value num">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
