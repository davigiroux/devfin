"use client";

import { Fragment, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Faturamento, DespesaMensal, PagamentoDespesa } from "@/types";
import { parseISO } from "date-fns";

interface DashboardChartsProps {
  faturamentos: Faturamento[];
  despesas: DespesaMensal[];
  pagamentos?: PagamentoDespesa[];
}

const hslToHex = (hslString: string): string => {
  const match = hslString.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%?\s+(\d+\.?\d*)%?/);
  if (!match) return hslString;

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const useChartColors = () => {
  if (typeof window === "undefined") {
    return {
      irpj: "#0F766E",
      csll: "#D97706",
      pis: "#1D4ED8",
      cofins: "#15803D",
      imposto: "#B91C1C",
      compromisso: "#D97706",
      revenue: "#15803D",
      expenses: "#B91C1C",
    };
  }

  const root = document.documentElement;
  const style = getComputedStyle(root);

  return {
    irpj: hslToHex(style.getPropertyValue("--chart-irpj")) || "#0F766E",
    csll: hslToHex(style.getPropertyValue("--chart-csll")) || "#D97706",
    pis: hslToHex(style.getPropertyValue("--chart-pis")) || "#1D4ED8",
    cofins: hslToHex(style.getPropertyValue("--chart-cofins")) || "#15803D",
    imposto: hslToHex(style.getPropertyValue("--chart-imposto")) || "#B91C1C",
    compromisso:
      hslToHex(style.getPropertyValue("--chart-compromisso")) || "#D97706",
    revenue: hslToHex(style.getPropertyValue("--chart-revenue")) || "#15803D",
    expenses: hslToHex(style.getPropertyValue("--chart-expenses")) || "#B91C1C",
  };
};

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface MonthlyData {
  month: string;
  year: number;
  monthNum: number;
  revenue: number;
  irpj: number;
  csll: number;
  pis: number;
  cofins: number;
  totalTax: number;
  expenses: number;
  expensesImposto: number;
  expensesCompromisso: number;
}

export default function DashboardCharts({
  faturamentos,
  despesas,
}: DashboardChartsProps) {
  const COLORS = useChartColors();
  const currentDate = new Date();
  const [startMonth, setStartMonth] = useState(0);
  const [startYear, setStartYear] = useState(currentDate.getFullYear());
  const [endMonth, setEndMonth] = useState(currentDate.getMonth());
  const [endYear, setEndYear] = useState(currentDate.getFullYear());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    // Filter faturamentos by date range
    const filtered = faturamentos.filter((f) => {
      const date = parseISO(f.data);
      const month = date.getMonth();
      const year = date.getFullYear();

      const startDate = new Date(startYear, startMonth, 1);
      const endDate = new Date(endYear, endMonth, 31);
      const itemDate = new Date(year, month, 1);

      return itemDate >= startDate && itemDate <= endDate;
    });

    // Group by month
    const monthlyData = new Map<string, MonthlyData>();

    filtered.forEach((f) => {
      const date = parseISO(f.data);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;

      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          month: MONTHS[month],
          year,
          monthNum: month + 1,
          revenue: 0,
          irpj: 0,
          csll: 0,
          pis: 0,
          cofins: 0,
          totalTax: 0,
          expenses: 0,
          expensesImposto: 0,
          expensesCompromisso: 0,
        });
      }

      const data = monthlyData.get(key)!;
      // For exports, use valor_recebido (actual cash flow), otherwise use valor_bruto
      const revenueAmount = f.exportacao && f.valor_recebido
        ? Number(f.valor_recebido)
        : Number(f.valor_bruto);
      data.revenue += revenueAmount;
      data.irpj += Number(f.irpj);
      data.csll += Number(f.csll);
      data.pis += Number(f.pis);
      data.cofins += Number(f.cofins);
      data.totalTax += Number(f.total_impostos);
    });

    // Add expenses to monthly data
    despesas.forEach((d) => {
      if (!d.ativa) return;

      if (d.recorrente) {
        // Add to each month in range
        const startDate = new Date(startYear, startMonth, 1);
        const endDate = new Date(endYear, endMonth, 31);
        const effectiveFrom = parseISO(d.effective_from);

        let currentDate = new Date(
          Math.max(startDate.getTime(), effectiveFrom.getTime())
        );

        while (currentDate <= endDate) {
          const month = currentDate.getMonth();
          const year = currentDate.getFullYear();
          const key = `${year}-${String(month + 1).padStart(2, "0")}`;

          if (!monthlyData.has(key)) {
            monthlyData.set(key, {
              month: MONTHS[month],
              year,
              monthNum: month + 1,
              revenue: 0,
              irpj: 0,
              csll: 0,
              pis: 0,
              cofins: 0,
              totalTax: 0,
              expenses: 0,
              expensesImposto: 0,
              expensesCompromisso: 0,
            });
          }

          const data = monthlyData.get(key)!;
          data.expenses += Number(d.valor);
          if (d.tipo === "imposto") {
            data.expensesImposto += Number(d.valor);
          } else {
            data.expensesCompromisso += Number(d.valor);
          }

          const nextMonth = currentDate.getMonth() + 1;
          currentDate = new Date(currentDate.getFullYear(), nextMonth, 1);
        }
      } else if (d.mes_referencia !== null && d.ano_referencia !== null) {
        // One-time expense
        const key = `${d.ano_referencia}-${String(d.mes_referencia).padStart(
          2,
          "0"
        )}`;

        if (monthlyData.has(key)) {
          const data = monthlyData.get(key)!;
          data.expenses += Number(d.valor);
          if (d.tipo === "imposto") {
            data.expensesImposto += Number(d.valor);
          } else {
            data.expensesCompromisso += Number(d.valor);
          }
        }
      }
    });

    return Array.from(monthlyData.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });
  }, [faturamentos, despesas, startMonth, startYear, endMonth, endYear]);

  // Tax breakdown pie chart data
  const taxBreakdown = useMemo(() => {
    const totals = filteredData.reduce(
      (acc, d) => ({
        irpj: acc.irpj + d.irpj,
        csll: acc.csll + d.csll,
        pis: acc.pis + d.pis,
        cofins: acc.cofins + d.cofins,
      }),
      { irpj: 0, csll: 0, pis: 0, cofins: 0 }
    );

    return [
      { name: "IRPJ", value: totals.irpj },
      { name: "CSLL", value: totals.csll },
      { name: "PIS", value: totals.pis },
      { name: "COFINS", value: totals.cofins },
    ].filter((item) => item.value > 0);
  }, [filteredData]);

  // Expense breakdown pie chart data
  const expenseBreakdown = useMemo(() => {
    const totals = filteredData.reduce(
      (acc, d) => ({
        imposto: acc.imposto + d.expensesImposto,
        compromisso: acc.compromisso + d.expensesCompromisso,
      }),
      { imposto: 0, compromisso: 0 }
    );

    return [
      { name: "Impostos", value: totals.imposto },
      { name: "Compromissos", value: totals.compromisso },
    ].filter((item) => item.value > 0);
  }, [filteredData]);

  // Tax payment schedule (revenue in month X -> tax paid in month X+1)
  const taxPaymentSchedule = useMemo(() => {
    return filteredData.map((d) => {
      const paymentYear = d.monthNum === 12 ? d.year + 1 : d.year;
      const paymentMonthNum = d.monthNum === 12 ? 1 : d.monthNum + 1;

      // Get despesas for payment month
      const monthDespesas = despesas.filter((desp) => {
        if (!desp.ativa) return false;

        if (desp.recorrente) {
          const effectiveFrom = parseISO(desp.effective_from);
          const effectiveMonth = effectiveFrom.getMonth() + 1;
          const effectiveYear = effectiveFrom.getFullYear();

          if (paymentYear < effectiveYear) return false;
          if (paymentYear === effectiveYear && paymentMonthNum < effectiveMonth)
            return false;

          return true;
        } else {
          return (
            desp.mes_referencia === paymentMonthNum &&
            desp.ano_referencia === paymentYear
          );
        }
      });

      const totalDespesas = monthDespesas.reduce(
        (acc, desp) => acc + Number(desp.valor),
        0
      );

      return {
        earningMonth: `${d.month}/${d.year}`,
        paymentMonth:
          d.monthNum === 12
            ? `Jan/${d.year + 1}`
            : `${MONTHS[d.monthNum]}/${d.year}`,
        paymentYear,
        paymentMonthNum,
        earningYear: d.year,
        earningMonthNum: d.monthNum,
        irpj: d.irpj,
        csll: d.csll,
        pis: d.pis,
        cofins: d.cofins,
        despesas: totalDespesas,
        total: d.totalTax + totalDespesas,
        revenue: d.revenue,
      };
    });
  }, [filteredData, despesas]);

  // Summary totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        tax: acc.tax + d.totalTax,
        expenses: acc.expenses + d.expenses,
        net: acc.net + (d.revenue - d.totalTax - d.expenses),
      }),
      { revenue: 0, tax: 0, expenses: 0, net: 0 }
    );
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const getDespesasForMonth = (year: number, month: number) => {
    return despesas.filter((d) => {
      if (!d.ativa) return false;

      if (d.recorrente) {
        const effectiveFrom = parseISO(d.effective_from);
        const effectiveMonth = effectiveFrom.getMonth() + 1;
        const effectiveYear = effectiveFrom.getFullYear();

        // Check if this month/year is after or equal to effective date
        if (year < effectiveYear) return false;
        if (year === effectiveYear && month < effectiveMonth) return false;

        return true;
      } else {
        // One-time expense
        return d.mes_referencia === month && d.ano_referencia === year;
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Mês Início
            </label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
            >
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Ano Início
            </label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              min="2020"
              max="2030"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Mês Fim
            </label>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
            >
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Ano Fim
            </label>
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              min="2020"
              max="2030"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Receita Bruta
          </div>
          <div className="text-2xl font-bold text-success">
            {formatCurrency(totals.revenue)}
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Impostos
          </div>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totals.tax)}
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Despesas
          </div>
          <div className="text-2xl font-bold text-warning">
            {formatCurrency(totals.expenses)}
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Líquido
          </div>
          <div
            className={`text-2xl font-bold ${
              totals.net >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {formatCurrency(totals.net)}
          </div>
        </div>
      </div>

      {/* Net Earnings After Deductions */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Saldo Líquido por Mês
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Faturamento restante após impostos e despesas
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase">
                  Mês
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Faturamento
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Impostos
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Despesas
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Saldo Líquido
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredData.map((item, idx) => {
                const net = item.revenue - item.totalTax - item.expenses;
                return (
                  <tr key={idx} className="hover:bg-muted">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                      {item.month}/{item.year}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-primary">
                      -{formatCurrency(item.totalTax)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-warning">
                      -{formatCurrency(item.expenses)}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                        net >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted border-t-2 border">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">
                  Total
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-foreground">
                  {formatCurrency(totals.revenue)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-primary">
                  -{formatCurrency(totals.tax)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-warning">
                  -{formatCurrency(totals.expenses)}
                </td>
                <td
                  className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${
                    totals.net >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(totals.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tax Payment Schedule */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          Cronograma de Pagamento de Impostos e Despesas
        </h3>
        <div className="bg-warning/10 border border-warning rounded-md p-4 mb-4">
          <p className="text-sm text-warning-foreground">
            <strong>⚠️ Importante:</strong> Os impostos sobre faturamento do mês
            X devem ser pagos no mês X+1.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase w-10"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase">
                  Faturamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase">
                  Pagar em
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Receita
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  IRPJ
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  CSLL
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  PIS
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  COFINS
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Despesas
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {taxPaymentSchedule.map((item, idx) => {
                const rowKey = `${item.paymentYear}-${item.paymentMonthNum}`;
                const isExpanded = expandedRows.has(rowKey);
                const monthDespesas = getDespesasForMonth(
                  item.paymentYear,
                  item.paymentMonthNum
                );

                return (
                  <Fragment key={rowKey}>
                    <tr
                      className="border-t border hover:bg-muted cursor-pointer"
                      onClick={() => toggleRow(rowKey)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                        {item.earningMonth}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary">
                        {item.paymentMonth}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {formatCurrency(item.irpj)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {formatCurrency(item.csll)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {formatCurrency(item.pis)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {formatCurrency(item.cofins)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-warning">
                        {formatCurrency(item.despesas)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-primary">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${idx}-detail`} className="bg-muted">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="ml-8">
                            <h4 className="text-sm font-semibold text-foreground mb-3">
                              Despesas de {item.paymentMonth}
                            </h4>
                            {monthDespesas.length > 0 ? (
                              <div className="space-y-2">
                                {monthDespesas.map((despesa) => (
                                  <div
                                    key={despesa.id}
                                    className="flex items-center justify-between py-2 px-3 bg-card rounded border"
                                  >
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-foreground">
                                        {despesa.descricao}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {despesa.tipo === "imposto"
                                          ? "Imposto"
                                          : "Compromisso"}{" "}
                                        •{" "}
                                        {despesa.recorrente
                                          ? "Recorrente"
                                          : "Único"}{" "}
                                        • Venc: dia {despesa.dia_vencimento}
                                      </div>
                                    </div>
                                    <div
                                      className={`text-sm font-semibold ${
                                        despesa.tipo === "imposto"
                                          ? "text-destructive"
                                          : "text-warning"
                                      }`}
                                    >
                                      {formatCurrency(Number(despesa.valor))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Nenhuma despesa cadastrada para este mês
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue & Tax Trend */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Receita e Impostos por Mês
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={COLORS.revenue}
              name="Receita"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="totalTax"
              stroke={COLORS.irpj}
              name="Impostos"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tax Breakdown & Expense Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Distribuição de Impostos
          </h3>
          {taxBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={taxBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taxBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[entry.name.toLowerCase() as keyof typeof COLORS]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">Sem dados</p>
          )}
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Distribuição de Despesas
          </h3>
          {expenseBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === "Impostos"
                          ? COLORS.imposto
                          : COLORS.compromisso
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-12">Sem dados</p>
          )}
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Fluxo de Caixa Mensal
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="revenue" fill={COLORS.revenue} name="Receita" />
            <Bar dataKey="totalTax" fill={COLORS.irpj} name="Impostos" />
            <Bar dataKey="expenses" fill={COLORS.expenses} name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
