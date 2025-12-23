'use client'

import { Faturamento } from '@/types'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { aggregateByMonth } from '@/lib/calculations/aggregations'

interface TaxComparisonChartsProps {
  faturamentos: Faturamento[]
}

const hslToHex = (hslString: string): string => {
  const match = hslString.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%?\s+(\d+\.?\d*)%?/)
  if (!match) return hslString

  const h = parseFloat(match[1]) / 360
  const s = parseFloat(match[2]) / 100
  const l = parseFloat(match[3]) / 100

  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const useChartColors = () => {
  if (typeof window === 'undefined') {
    return {
      irpj: '#8b5cf6',
      csll: '#ec4899',
      pis: '#3b82f6',
      cofins: '#10b981',
      revenue: '#22c55e',
      net: '#f59e0b',
    }
  }

  const root = document.documentElement
  const style = getComputedStyle(root)

  return {
    irpj: hslToHex(style.getPropertyValue('--chart-irpj')) || '#8b5cf6',
    csll: hslToHex(style.getPropertyValue('--chart-csll')) || '#ec4899',
    pis: hslToHex(style.getPropertyValue('--chart-pis')) || '#3b82f6',
    cofins: hslToHex(style.getPropertyValue('--chart-cofins')) || '#10b981',
    revenue: hslToHex(style.getPropertyValue('--chart-revenue')) || '#22c55e',
    net: '#f59e0b',
  }
}

export default function TaxComparisonCharts({ faturamentos }: TaxComparisonChartsProps) {
  const COLORS = useChartColors()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Get current year data
  const currentYear = new Date().getFullYear()
  const yearFaturamentos = faturamentos.filter((f) => {
    const year = new Date(f.data).getFullYear()
    return year === currentYear
  })

  const monthly = aggregateByMonth(yearFaturamentos)

  // Calculate totals
  const totals = monthly.reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.revenue,
      irpj: acc.irpj + m.irpj,
      csll: acc.csll + m.csll,
      pis: acc.pis + m.pis,
      cofins: acc.cofins + m.cofins,
      totalTax: acc.totalTax + m.totalTax,
    }),
    { revenue: 0, irpj: 0, csll: 0, pis: 0, cofins: 0, totalTax: 0 }
  )

  const netRevenue = totals.revenue - totals.totalTax

  // Pie chart data: Revenue vs Taxes
  const revenueVsTaxData = [
    { name: 'Líquido', value: netRevenue },
    { name: 'Impostos', value: totals.totalTax },
  ].filter((item) => item.value > 0)

  // Tax breakdown data
  const taxBreakdownData = [
    { name: 'IRPJ', value: totals.irpj },
    { name: 'CSLL', value: totals.csll },
    { name: 'PIS', value: totals.pis },
    { name: 'COFINS', value: totals.cofins },
  ].filter((item) => item.value > 0)

  // Bar chart data showing percentage breakdown
  const percentageData = [
    {
      name: 'Distribuição',
      Líquido: totals.revenue > 0 ? (netRevenue / totals.revenue) * 100 : 0,
      Impostos: totals.revenue > 0 ? (totals.totalTax / totals.revenue) * 100 : 0,
    },
  ]

  if (yearFaturamentos.length === 0) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Comparação Faturamento vs Impostos
        </h3>
        <p className="text-muted-foreground text-center py-8">
          Nenhum faturamento cadastrado para {currentYear}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Revenue vs Taxes Pie Chart */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Faturamento vs Impostos ({currentYear})
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={revenueVsTaxData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueVsTaxData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Líquido' ? COLORS.net : COLORS.irpj}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={percentageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                <Legend />
                <Bar dataKey="Líquido" stackId="a" fill={COLORS.net} />
                <Bar dataKey="Impostos" stackId="a" fill={COLORS.irpj} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Faturamento Total:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(totals.revenue)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Impostos:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(totals.totalTax)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Líquido:</span>
                <span className="font-semibold text-success">
                  {formatCurrency(netRevenue)}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">% Impostos:</span>
                <span className="font-bold text-primary">
                  {totals.revenue > 0
                    ? ((totals.totalTax / totals.revenue) * 100).toFixed(2)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Breakdown Pie Chart */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Distribuição de Impostos ({currentYear})
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={taxBreakdownData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${((percent || 0) * 100).toFixed(1)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {taxBreakdownData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
