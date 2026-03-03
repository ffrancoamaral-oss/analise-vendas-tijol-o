import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { AnalysisData } from '@/types/analysis';
import { getCurve, formatCurrency, formatPercent } from '@/utils/calculations';

interface AnalysisChartsProps {
  data: AnalysisData;
  type: 'sales' | 'margins';
}

const COLORS = {
  primary: 'hsl(172, 66%, 40%)',
  secondary: 'hsl(220, 14%, 75%)',
  positive: 'hsl(152, 60%, 40%)',
  negative: 'hsl(0, 72%, 51%)',
  warning: 'hsl(38, 92%, 50%)',
  curveA: 'hsl(172, 66%, 40%)',
  curveB: 'hsl(38, 92%, 50%)',
  curveC: 'hsl(220, 14%, 75%)',
};

const PIE_COLORS = [
  'hsl(172, 66%, 40%)', 'hsl(200, 60%, 50%)', 'hsl(38, 92%, 50%)',
  'hsl(280, 50%, 50%)', 'hsl(340, 60%, 50%)', 'hsl(152, 60%, 40%)',
  'hsl(20, 70%, 50%)', 'hsl(260, 50%, 60%)', 'hsl(100, 40%, 45%)',
  'hsl(0, 60%, 55%)',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-mono text-xs">
          {entry.name}: {typeof entry.value === 'number' && entry.value > 1000
            ? formatCurrency(entry.value)
            : formatPercent(entry.value)}
        </p>
      ))}
    </div>
  );
};

const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ data, type }) => {
  if (type === 'sales') {
    // Top 10 product lines by sales realized
    const topProducts = [...data.productLines]
      .filter(p => p.salesTarget > 0)
      .sort((a, b) => b.salesRealized - a.salesRealized)
      .slice(0, 10)
      .map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
        fullName: p.name,
        meta: p.salesTarget,
        realizado: p.salesRealized,
      }));

    // Curve distribution
    const curveData = [
      { name: 'Curva A', value: 0, color: COLORS.curveA },
      { name: 'Curva B', value: 0, color: COLORS.curveB },
      { name: 'Curva C', value: 0, color: COLORS.curveC },
    ];
    
    data.productLines.forEach(p => {
      const curve = getCurve(p.participationTarget);
      const idx = curve === 'A' ? 0 : curve === 'B' ? 1 : 2;
      curveData[idx].value += p.salesRealized;
    });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="module-card p-4">
          <h3 className="text-sm font-semibold mb-4">Top 10 — Meta vs Realizado</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 89%)" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={11} />
              <YAxis type="category" dataKey="name" width={120} fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="meta" fill={COLORS.secondary} name="Meta" radius={[0, 2, 2, 0]} />
              <Bar dataKey="realizado" fill={COLORS.primary} name="Realizado" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="module-card p-4">
          <h3 className="text-sm font-semibold mb-4">Distribuição por Curva ABC</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={curveData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {curveData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Margins charts
  const marginData = data.productLines
    .filter(p => p.marginTarget > 0)
    .sort((a, b) => (b.marginRealized - b.marginTarget) - (a.marginRealized - a.marginTarget))
    .slice(0, 15)
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      resultado: +(p.marginRealized - p.marginTarget).toFixed(2),
    }));

  // Participation pie
  const partData = data.productLines
    .filter(p => p.participationRealized > 0)
    .sort((a, b) => b.participationRealized - a.participationRealized)
    .slice(0, 10)
    .map(p => ({
      name: p.name.length > 18 ? p.name.substring(0, 18) + '...' : p.name,
      value: p.participationRealized,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="module-card p-4">
        <h3 className="text-sm font-semibold mb-4">Resultado de Margem (Realizado - Previsto)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={marginData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 89%)" />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={11} />
            <YAxis type="category" dataKey="name" width={130} fontSize={11} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="resultado" name="Resultado" radius={[0, 4, 4, 0]}>
              {marginData.map((entry, i) => (
                <Cell key={i} fill={entry.resultado >= 0 ? COLORS.positive : COLORS.negative} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="module-card p-4">
        <h3 className="text-sm font-semibold mb-4">Participação Realizada — Top 10</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={partData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {partData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatPercent(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalysisCharts;
