import {
  filtrarDespesasMes,
  calcularTotalDespesasMensais,
  calcularCaixaNecessario,
} from '@/lib/calculations/caixa'
import { DespesaMensal, PagamentoDespesa } from '@/types'

const mockDespesas: DespesaMensal[] = [
  {
    id: '1',
    descricao: 'INSS',
    tipo: 'imposto',
    valor: 1000,
    dia_vencimento: 20,
    recorrente: true,
    mes_referencia: null,
    ano_referencia: null,
    ativa: true,
    effective_from: '2025-01-01',
    version: 1,
    previous_version_id: null,
    usuario_id: 'user1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
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
    effective_from: '2025-01-01',
    version: 1,
    previous_version_id: null,
    usuario_id: 'user1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
  {
    id: '3',
    descricao: 'Bônus Anual',
    tipo: 'compromisso',
    valor: 5000,
    dia_vencimento: 15,
    recorrente: false,
    mes_referencia: 12,
    ano_referencia: 2025,
    ativa: true,
    effective_from: '2025-01-01',
    version: 1,
    previous_version_id: null,
    usuario_id: 'user1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
  {
    id: '4',
    descricao: 'Taxa Inativa',
    tipo: 'imposto',
    valor: 500,
    dia_vencimento: 5,
    recorrente: true,
    mes_referencia: null,
    ano_referencia: null,
    ativa: false,
    effective_from: '2025-01-01',
    version: 1,
    previous_version_id: null,
    usuario_id: 'user1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
]

const mockPagamentos: PagamentoDespesa[] = []

describe('Cálculos de Caixa', () => {
  describe('filtrarDespesasMes', () => {
    it('deve retornar apenas despesas recorrentes ativas para janeiro/2025', () => {
      const resultado = filtrarDespesasMes(mockDespesas, 1, 2025)

      expect(resultado).toHaveLength(2)
      expect(resultado.map(d => d.id)).toEqual(['1', '2'])
    })

    it('deve incluir despesa única para dezembro/2025', () => {
      const resultado = filtrarDespesasMes(mockDespesas, 12, 2025)

      expect(resultado).toHaveLength(3)
      expect(resultado.map(d => d.id)).toContain('3')
    })

    it('deve excluir despesa única em mês diferente', () => {
      // Testing November 2025 which should not include the one-off expense for December 2025
      const resultado = filtrarDespesasMes(mockDespesas, 11, 2025)

      expect(resultado).toHaveLength(2)
      expect(resultado.map(d => d.id)).not.toContain('3')
    })

    it('deve excluir despesas inativas', () => {
      const resultado = filtrarDespesasMes(mockDespesas, 1, 2025)

      expect(resultado.map(d => d.id)).not.toContain('4')
    })

    it('deve retornar array vazio para lista vazia', () => {
      const resultado = filtrarDespesasMes([], 1, 2025)

      expect(resultado).toEqual([])
    })
  })

  describe('calcularTotalDespesasMensais', () => {
    it('deve calcular total correto para janeiro/2025', () => {
      const total = calcularTotalDespesasMensais(mockDespesas, 1, 2025)

      expect(total).toBe(3000) // 1000 + 2000
    })

    it('deve calcular total incluindo despesa única em dezembro/2025', () => {
      const total = calcularTotalDespesasMensais(mockDespesas, 12, 2025)

      expect(total).toBe(8000) // 1000 + 2000 + 5000
    })

    it('deve retornar 0 para mês sem despesas', () => {
      const total = calcularTotalDespesasMensais([], 1, 2025)

      expect(total).toBe(0)
    })

    it('deve arredondar para 2 casas decimais', () => {
      const despesasComDecimais: DespesaMensal[] = [
        {
          ...mockDespesas[0],
          valor: 100.556,
        },
        {
          ...mockDespesas[1],
          valor: 200.444,
        },
      ]

      const total = calcularTotalDespesasMensais(despesasComDecimais, 1, 2025)

      expect(total).toBe(301)
    })
  })

  describe('calcularCaixaNecessario', () => {
    it('deve calcular caixa necessário com detalhamento por tipo para janeiro/2025', () => {
      const resultado = calcularCaixaNecessario(mockDespesas, mockPagamentos, 1, 2025)

      expect(resultado.total_despesas).toBe(3000)
      expect(resultado.despesas_impostos).toBe(1000)
      expect(resultado.despesas_compromissos).toBe(2000)
      expect(resultado.despesas).toHaveLength(2)
    })

    it('deve incluir despesa única no cálculo para dezembro/2025', () => {
      const resultado = calcularCaixaNecessario(mockDespesas, mockPagamentos, 12, 2025)

      expect(resultado.total_despesas).toBe(8000)
      expect(resultado.despesas_impostos).toBe(1000)
      expect(resultado.despesas_compromissos).toBe(7000) // 2000 + 5000
      expect(resultado.despesas).toHaveLength(3)
    })

    it('deve retornar zeros para mês sem despesas', () => {
      const resultado = calcularCaixaNecessario([], mockPagamentos, 1, 2025)

      expect(resultado.total_despesas).toBe(0)
      expect(resultado.despesas_impostos).toBe(0)
      expect(resultado.despesas_compromissos).toBe(0)
      expect(resultado.despesas).toEqual([])
    })

    it('deve separar corretamente por tipo', () => {
      const resultado = calcularCaixaNecessario(mockDespesas, mockPagamentos, 1, 2025)

      const impostos = resultado.despesas.filter(d => d.tipo === 'imposto')
      const compromissos = resultado.despesas.filter(d => d.tipo === 'compromisso')

      expect(impostos).toHaveLength(1)
      expect(compromissos).toHaveLength(1)
      expect(impostos[0].valor).toBe(1000)
      expect(compromissos[0].valor).toBe(2000)
    })

    it('deve arredondar valores para 2 casas decimais', () => {
      const despesasComDecimais: DespesaMensal[] = [
        {
          ...mockDespesas[0],
          tipo: 'imposto',
          valor: 100.556,
        },
        {
          ...mockDespesas[1],
          tipo: 'compromisso',
          valor: 200.444,
        },
      ]

      const resultado = calcularCaixaNecessario(despesasComDecimais, mockPagamentos, 1, 2025)

      expect(resultado.total_despesas).toBe(301)
      expect(resultado.despesas_impostos).toBe(100.56)
      expect(resultado.despesas_compromissos).toBe(200.44)
    })

    it('deve usar valor_pago do pagamento quando disponível', () => {
      const pagamentosComValor: PagamentoDespesa[] = [
        {
          id: 'p1',
          despesa_id: '1',
          mes_referencia: 1,
          ano_referencia: 2025,
          pago: true,
          data_pagamento: '2025-01-20',
          valor_pago: 1200, // Valor diferente do valor atual da despesa (1000)
          created_at: '2025-01-20',
          updated_at: '2025-01-20',
        },
      ]

      const resultado = calcularCaixaNecessario(mockDespesas, pagamentosComValor, 1, 2025)

      // Deve usar 1200 (valor_pago) ao invés de 1000 (valor atual)
      expect(resultado.total_despesas).toBe(3200) // 1200 + 2000
      expect(resultado.despesas_impostos).toBe(1200)
      expect(resultado.despesas_compromissos).toBe(2000)
    })

    it('deve usar valor atual quando valor_pago não está disponível', () => {
      const pagamentosSemValor: PagamentoDespesa[] = [
        {
          id: 'p1',
          despesa_id: '1',
          mes_referencia: 1,
          ano_referencia: 2025,
          pago: false,
          data_pagamento: null,
          valor_pago: null, // Sem valor_pago
          created_at: '2025-01-20',
          updated_at: '2025-01-20',
        },
      ]

      const resultado = calcularCaixaNecessario(mockDespesas, pagamentosSemValor, 1, 2025)

      // Deve usar valor atual (1000)
      expect(resultado.total_despesas).toBe(3000)
      expect(resultado.despesas_impostos).toBe(1000)
    })
  })

  describe('filtrarDespesasMes - effective_from', () => {
    it('deve excluir despesas com effective_from no futuro', () => {
      const despesasComFuturo: DespesaMensal[] = [
        ...mockDespesas,
        {
          id: '5',
          descricao: 'Despesa Futura',
          tipo: 'imposto',
          valor: 3000,
          dia_vencimento: 15,
          recorrente: true,
          mes_referencia: null,
          ano_referencia: null,
          ativa: true,
          effective_from: '2025-06-01', // Efetiva a partir de junho
          version: 1,
          previous_version_id: null,
          usuario_id: 'user1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ]

      const resultadoJan = filtrarDespesasMes(despesasComFuturo, 1, 2025)
      const resultadoJun = filtrarDespesasMes(despesasComFuturo, 6, 2025)

      // Janeiro: não deve incluir despesa com effective_from em junho
      expect(resultadoJan.map(d => d.id)).not.toContain('5')

      // Junho: deve incluir despesa com effective_from em junho
      expect(resultadoJun.map(d => d.id)).toContain('5')
    })

    it('deve incluir despesas com effective_from no passado', () => {
      const despesasComPassado: DespesaMensal[] = [
        {
          ...mockDespesas[0],
          effective_from: '2024-12-01', // Efetiva desde dezembro/2024
        },
      ]

      const resultado = filtrarDespesasMes(despesasComPassado, 1, 2025)

      expect(resultado).toHaveLength(1)
      expect(resultado[0].id).toBe('1')
    })

    it('deve incluir despesas com effective_from no primeiro dia do mês alvo', () => {
      const despesasComMesmoMes: DespesaMensal[] = [
        {
          ...mockDespesas[0],
          effective_from: '2025-01-01', // Primeiro dia de janeiro
        },
      ]

      const resultado = filtrarDespesasMes(despesasComMesmoMes, 1, 2025)

      expect(resultado).toHaveLength(1)
      expect(resultado[0].id).toBe('1')
    })
  })
})
