import {
  getQuarterDates,
  getCurrentQuarter,
  getQuarterOptions,
  parseQuarter,
  aggregateFaturamentos,
  aggregateDespesas,
  filterFaturamentosByQuarter,
  filterDespesasByQuarter,
  filterPagamentosByQuarter,
  getQuarterlyComparison,
} from '@/lib/calculations/quarterly'
import type { Faturamento, DespesaMensal, PagamentoDespesa, QuarterlyData } from '@/types'

describe('Quarterly Calculations', () => {
  describe('getQuarterDates', () => {
    it('should return correct dates for Q1', () => {
      const { start, end, months } = getQuarterDates(2024, 1)

      expect(start).toEqual(new Date(2024, 0, 1))
      expect(end).toEqual(new Date(2024, 2, 31, 23, 59, 59, 999))
      expect(months).toEqual([1, 2, 3])
    })

    it('should return correct dates for Q2', () => {
      const { start, end, months } = getQuarterDates(2024, 2)

      expect(start).toEqual(new Date(2024, 3, 1))
      expect(end).toEqual(new Date(2024, 5, 30, 23, 59, 59, 999))
      expect(months).toEqual([4, 5, 6])
    })

    it('should return correct dates for Q3', () => {
      const { start, end, months } = getQuarterDates(2024, 3)

      expect(start).toEqual(new Date(2024, 6, 1))
      expect(end).toEqual(new Date(2024, 8, 30, 23, 59, 59, 999))
      expect(months).toEqual([7, 8, 9])
    })

    it('should return correct dates for Q4', () => {
      const { start, end, months } = getQuarterDates(2024, 4)

      expect(start).toEqual(new Date(2024, 9, 1))
      expect(end).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999))
      expect(months).toEqual([10, 11, 12])
    })

    it('should throw error for invalid quarter', () => {
      expect(() => getQuarterDates(2024, 0)).toThrow('Quarter must be between 1 and 4')
      expect(() => getQuarterDates(2024, 5)).toThrow('Quarter must be between 1 and 4')
    })
  })

  describe('getCurrentQuarter', () => {
    it('should return valid quarter', () => {
      const { year, quarter } = getCurrentQuarter()

      expect(year).toBeGreaterThan(2020)
      expect(quarter).toBeGreaterThanOrEqual(1)
      expect(quarter).toBeLessThanOrEqual(4)
    })
  })

  describe('parseQuarter', () => {
    it('should parse valid quarter string', () => {
      const { year, quarter } = parseQuarter('2024-Q1')

      expect(year).toBe(2024)
      expect(quarter).toBe(1)
    })

    it('should throw error for invalid format', () => {
      expect(() => parseQuarter('2024-Q5')).toThrow('Invalid quarter format')
      expect(() => parseQuarter('2024Q1')).toThrow('Invalid quarter format')
      expect(() => parseQuarter('Q1-2024')).toThrow('Invalid quarter format')
    })
  })

  describe('getQuarterOptions', () => {
    it('should return 13 quarter options', () => {
      const options = getQuarterOptions()

      expect(options).toHaveLength(13)
    })

    it('should have correct format', () => {
      const options = getQuarterOptions()

      options.forEach(opt => {
        expect(opt.value).toMatch(/^\d{4}-Q[1-4]$/)
        expect(opt.label).toMatch(/^Q[1-4] \d{4}$/)
        expect(opt.quarter).toBeGreaterThanOrEqual(1)
        expect(opt.quarter).toBeLessThanOrEqual(4)
      })
    })
  })

  describe('aggregateFaturamentos', () => {
    it('should return zeros for empty array', () => {
      const result = aggregateFaturamentos([])

      expect(result.total_bruto).toBe(0)
      expect(result.total_irpj).toBe(0)
      expect(result.total_csll).toBe(0)
      expect(result.total_pis).toBe(0)
      expect(result.total_cofins).toBe(0)
      expect(result.total_impostos).toBe(0)
      expect(result.count).toBe(0)
      expect(result.faturamentos).toEqual([])
    })

    it('should aggregate faturamentos correctly', () => {
      const faturamentos: Faturamento[] = [
        {
          id: '1',
          data: '2024-01-15',
          valor_bruto: 10000,
          irpj: 480,
          csll: 288,
          pis: 65,
          cofins: 300,
          total_impostos: 1133,
          exportacao: false,
          usuario_id: 'user1',
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
        },
        {
          id: '2',
          data: '2024-02-15',
          valor_bruto: 20000,
          irpj: 960,
          csll: 576,
          pis: 130,
          cofins: 600,
          total_impostos: 2266,
          exportacao: false,
          usuario_id: 'user1',
          created_at: '2024-02-15',
          updated_at: '2024-02-15',
        },
      ]

      const result = aggregateFaturamentos(faturamentos)

      expect(result.total_bruto).toBe(30000)
      expect(result.total_irpj).toBe(1440)
      expect(result.total_csll).toBe(864)
      expect(result.total_pis).toBe(195)
      expect(result.total_cofins).toBe(900)
      expect(result.total_impostos).toBe(3399)
      expect(result.count).toBe(2)
    })
  })

  describe('aggregateDespesas', () => {
    it('should aggregate despesas by type', () => {
      const despesas: DespesaMensal[] = [
        {
          id: '1',
          descricao: 'DAS',
          tipo: 'imposto',
          valor: 1000,
          dia_vencimento: 20,
          recorrente: true,
          mes_referencia: null,
          ano_referencia: null,
          ativa: true,
          effective_from: '2024-01-01',
          version: 1,
          previous_version_id: null,
          usuario_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          descricao: 'Aluguel',
          tipo: 'compromisso',
          valor: 2000,
          dia_vencimento: 10,
          recorrente: true,
          mes_referencia: null,
          ano_referencia: null,
          ativa: true,
          effective_from: '2024-01-01',
          version: 1,
          previous_version_id: null,
          usuario_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]

      const pagamentos: PagamentoDespesa[] = [
        {
          id: 'p1',
          despesa_id: '1',
          mes_referencia: 1,
          ano_referencia: 2024,
          pago: true,
          data_pagamento: '2024-01-20',
          valor_pago: 1000,
          created_at: '2024-01-20',
          updated_at: '2024-01-20',
        },
        {
          id: 'p2',
          despesa_id: '2',
          mes_referencia: 1,
          ano_referencia: 2024,
          pago: true,
          data_pagamento: '2024-01-10',
          valor_pago: 2000,
          created_at: '2024-01-10',
          updated_at: '2024-01-10',
        },
      ]

      const result = aggregateDespesas(despesas, pagamentos)

      expect(result.total_impostos).toBe(1000)
      expect(result.total_compromissos).toBe(2000)
      expect(result.despesas_impostos).toHaveLength(1)
      expect(result.despesas_compromissos).toHaveLength(1)
    })
  })

  describe('filterFaturamentosByQuarter', () => {
    it('should filter faturamentos by quarter', () => {
      const faturamentos: Faturamento[] = [
        {
          id: '1',
          data: '2024-01-15',
          valor_bruto: 10000,
          irpj: 480,
          csll: 288,
          pis: 65,
          cofins: 300,
          total_impostos: 1133,
          exportacao: false,
          usuario_id: 'user1',
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
        },
        {
          id: '2',
          data: '2024-04-15',
          valor_bruto: 20000,
          irpj: 960,
          csll: 576,
          pis: 130,
          cofins: 600,
          total_impostos: 2266,
          exportacao: false,
          usuario_id: 'user1',
          created_at: '2024-04-15',
          updated_at: '2024-04-15',
        },
      ]

      const q1 = filterFaturamentosByQuarter(faturamentos, 2024, 1)
      const q2 = filterFaturamentosByQuarter(faturamentos, 2024, 2)

      expect(q1).toHaveLength(1)
      expect(q1[0].id).toBe('1')
      expect(q2).toHaveLength(1)
      expect(q2[0].id).toBe('2')
    })
  })

  describe('filterDespesasByQuarter', () => {
    it('should include recurring despesas', () => {
      const despesas: DespesaMensal[] = [
        {
          id: '1',
          descricao: 'DAS',
          tipo: 'imposto',
          valor: 1000,
          dia_vencimento: 20,
          recorrente: true,
          mes_referencia: null,
          ano_referencia: null,
          ativa: true,
          effective_from: '2024-01-01',
          version: 1,
          previous_version_id: null,
          usuario_id: 'user1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]

      const result = filterDespesasByQuarter(despesas, 2024, 1)

      expect(result).toHaveLength(1)
    })

    it('should filter one-off despesas by quarter', () => {
      const despesas: DespesaMensal[] = [
        {
          id: '1',
          descricao: 'Despesa Q1',
          tipo: 'compromisso',
          valor: 1000,
          dia_vencimento: 15,
          recorrente: false,
          mes_referencia: 2,
          ano_referencia: 2024,
          ativa: true,
          effective_from: '2024-02-01',
          version: 1,
          previous_version_id: null,
          usuario_id: 'user1',
          created_at: '2024-02-01',
          updated_at: '2024-02-01',
        },
        {
          id: '2',
          descricao: 'Despesa Q2',
          tipo: 'compromisso',
          valor: 2000,
          dia_vencimento: 15,
          recorrente: false,
          mes_referencia: 5,
          ano_referencia: 2024,
          ativa: true,
          effective_from: '2024-05-01',
          version: 1,
          previous_version_id: null,
          usuario_id: 'user1',
          created_at: '2024-05-01',
          updated_at: '2024-05-01',
        },
      ]

      const q1 = filterDespesasByQuarter(despesas, 2024, 1)
      const q2 = filterDespesasByQuarter(despesas, 2024, 2)

      expect(q1).toHaveLength(1)
      expect(q1[0].id).toBe('1')
      expect(q2).toHaveLength(1)
      expect(q2[0].id).toBe('2')
    })
  })

  describe('filterPagamentosByQuarter', () => {
    it('should filter pagamentos by quarter', () => {
      const pagamentos: PagamentoDespesa[] = [
        {
          id: 'p1',
          despesa_id: '1',
          mes_referencia: 1,
          ano_referencia: 2024,
          pago: true,
          data_pagamento: '2024-01-20',
          valor_pago: 1000,
          created_at: '2024-01-20',
          updated_at: '2024-01-20',
        },
        {
          id: 'p2',
          despesa_id: '1',
          mes_referencia: 5,
          ano_referencia: 2024,
          pago: true,
          data_pagamento: '2024-05-20',
          valor_pago: 1000,
          created_at: '2024-05-20',
          updated_at: '2024-05-20',
        },
      ]

      const q1 = filterPagamentosByQuarter(pagamentos, 2024, 1)
      const q2 = filterPagamentosByQuarter(pagamentos, 2024, 2)

      expect(q1).toHaveLength(1)
      expect(q1[0].id).toBe('p1')
      expect(q2).toHaveLength(1)
      expect(q2[0].id).toBe('p2')
    })
  })

  describe('getQuarterlyComparison', () => {
    it('should create comparison data', () => {
      const quarterlyData: QuarterlyData[] = [
        {
          year: 2024,
          quarter: 1,
          faturamentos: {
            total_bruto: 10000,
            total_irpj: 480,
            total_csll: 288,
            total_pis: 65,
            total_cofins: 300,
            total_impostos: 1133,
            faturamentos: [],
            count: 1,
          },
          despesas: {
            total_impostos: 1000,
            total_compromissos: 2000,
            despesas_impostos: [],
            despesas_compromissos: [],
            pagamentos: [],
          },
        },
        {
          year: 2024,
          quarter: 2,
          faturamentos: {
            total_bruto: 20000,
            total_irpj: 960,
            total_csll: 576,
            total_pis: 130,
            total_cofins: 600,
            total_impostos: 2266,
            faturamentos: [],
            count: 1,
          },
          despesas: {
            total_impostos: 1000,
            total_compromissos: 2000,
            despesas_impostos: [],
            despesas_compromissos: [],
            pagamentos: [],
          },
        },
      ]

      const result = getQuarterlyComparison(quarterlyData)

      expect(result.quarters).toHaveLength(2)
      expect(result.quarters[0]).toEqual({
        label: 'Q1 2024',
        receita: 10000,
        impostos: 2133, // 1133 + 1000
      })
      expect(result.quarters[1]).toEqual({
        label: 'Q2 2024',
        receita: 20000,
        impostos: 3266, // 2266 + 1000
      })
    })
  })
})
