import {
  filtrarDespesasMes,
  calcularTotalDespesasMensais,
  calcularCaixaNecessario,
} from '@/lib/calculations/caixa'
import { DespesaMensal } from '@/types'

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
    usuario_id: 'user1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
]

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
      const resultado = filtrarDespesasMes(mockDespesas, 12, 2024)

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
      const resultado = calcularCaixaNecessario(mockDespesas, 1, 2025)

      expect(resultado.total_despesas).toBe(3000)
      expect(resultado.despesas_impostos).toBe(1000)
      expect(resultado.despesas_compromissos).toBe(2000)
      expect(resultado.despesas).toHaveLength(2)
    })

    it('deve incluir despesa única no cálculo para dezembro/2025', () => {
      const resultado = calcularCaixaNecessario(mockDespesas, 12, 2025)

      expect(resultado.total_despesas).toBe(8000)
      expect(resultado.despesas_impostos).toBe(1000)
      expect(resultado.despesas_compromissos).toBe(7000) // 2000 + 5000
      expect(resultado.despesas).toHaveLength(3)
    })

    it('deve retornar zeros para mês sem despesas', () => {
      const resultado = calcularCaixaNecessario([], 1, 2025)

      expect(resultado.total_despesas).toBe(0)
      expect(resultado.despesas_impostos).toBe(0)
      expect(resultado.despesas_compromissos).toBe(0)
      expect(resultado.despesas).toEqual([])
    })

    it('deve separar corretamente por tipo', () => {
      const resultado = calcularCaixaNecessario(mockDespesas, 1, 2025)

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

      const resultado = calcularCaixaNecessario(despesasComDecimais, 1, 2025)

      expect(resultado.total_despesas).toBe(301)
      expect(resultado.despesas_impostos).toBe(100.56)
      expect(resultado.despesas_compromissos).toBe(200.44)
    })
  })
})
