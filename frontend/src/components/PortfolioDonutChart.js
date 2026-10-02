import React, { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { getAssetMeta } from '../lib/assets';
import { useApp } from './ui';

const MAX_SLICES = 7;

function PortfolioDonutChart({ holdings = [] }) {
  const { money } = useApp();
  const [active, setActive] = useState(null);

  const data = useMemo(() => {
    const sorted = holdings
      .filter((h) => h.total_value > 0)
      .map((h) => ({ key: h.asset, name: getAssetMeta(h.asset).name, value: h.total_value }))
      .sort((a, b) => b.value - a.value);
    if (sorted.length <= MAX_SLICES + 1) return sorted;
    const rest = sorted.slice(MAX_SLICES);
    return [...sorted.slice(0, MAX_SLICES), { key: '__other', name: `Other (${rest.length})`, value: rest.reduce((s, d) => s + d.value, 0) }];
  }, [holdings]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const current = active !== null ? data[active] : null;

  if (!data.length) return null;

  return (
    <div className="donut">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 1.5 : 0}
              cornerRadius={4}
              stroke="var(--surface)"
              strokeWidth={data.length > 1 ? 2 : 0}
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={700}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.key}
                  fill={d.key === '__other' ? 'var(--series-other)' : `var(--series-${i + 1})`}
                  opacity={active === null || active === i ? 1 : 0.35}
                  style={{ transition: 'opacity 160ms ease', outline: 'none', cursor: 'pointer' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-live="polite">
          <span className="donut-center-label">{current ? current.name : 'Allocated'}</span>
          <span className="donut-center-value">{money(current ? current.value : total, { compact: true })}</span>
          {current && <span className="donut-center-sub">{((current.value / total) * 100).toFixed(1)}% of portfolio</span>}
        </div>
      </div>

      <ul className="donut-legend">
        {data.map((d, i) => (
          <li
            key={d.key}
            className={active === i ? 'active' : ''}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="legend-swatch" style={{ background: d.key === '__other' ? 'var(--series-other)' : `var(--series-${i + 1})` }} />
            <span className="legend-name">{d.name}</span>
            <span className="legend-value num">{((d.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PortfolioDonutChart;
