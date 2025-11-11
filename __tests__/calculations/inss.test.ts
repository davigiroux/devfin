import {
  calcularINSSProgressivo,
  calcularAliquotaEfetiva,
  calcularINSSSocios,
  calcularProlaboreMinimo,
  INSS_CONFIG,
} from '@/lib/calculations/inss'
import { Socio } from '@/types'

describe('Cálculo de INSS Pró-labore', () => {
  describe('calcularINSSProgressivo', () => {
    it('deve calcular INSS corretamente para salário mínimo', () => {
      const inss = calcularINSSProgressivo(1412.00)

      // Primeira faixa: 1412 * 7.5% = 105.90
      expect(inss).toBeCloseTo(105.90, 2)
    })

    it('deve calcular INSS corretamente para R$ 3.000,00', () => {
      const inss = calcularINSSProgressivo(3000)

      // Faixa 1: 1412 * 7.5% = 105.90
      // Faixa 2: (2666.68 - 1412) * 9% = 112.92
      // Faixa 3: (3000 - 2666.68) * 12% = 39.99
      // Total: 258.82 (com arredondamento)
      expect(inss).toBeCloseTo(258.82, 2)
    })

    it('deve calcular INSS corretamente para R$ 5.000,00', () => {
      const inss = calcularINSSProgressivo(5000)

      // Faixa 1: 1412 * 7.5% = 105.90
      // Faixa 2: (2666.68 - 1412) * 9% = 112.92
      // Faixa 3: (4000.03 - 2666.68) * 12% = 160.00
      // Faixa 4: (5000 - 4000.03) * 14% = 139.99
      // Total: 518.82 (com arredondamento)
      expect(inss).toBeCloseTo(518.82, 2)
    })

    it('deve respeitar o teto do INSS', () => {
      const inssTeto = calcularINSSProgressivo(INSS_CONFIG.TETO_INSS)
      const inssAcimaTeto = calcularINSSProgressivo(INSS_CONFIG.TETO_INSS + 1000)

      expect(inssTeto).toBe(inssAcimaTeto)
    })

    it('deve retornar zero para valor zero', () => {
      const inss = calcularINSSProgressivo(0)
      expect(inss).toBe(0)
    })

    it('deve lançar erro para valores negativos', () => {
      expect(() => calcularINSSProgressivo(-1000)).toThrow(
        'Valor do pró-labore não pode ser negativo'
      )
    })

    it('deve lançar erro para valores inválidos', () => {
      expect(() => calcularINSSProgressivo(NaN)).toThrow(
        'Valor do pró-labore deve ser um número válido'
      )
    })
  })

  describe('calcularAliquotaEfetiva', () => {
    it('deve calcular alíquota efetiva corretamente', () => {
      const aliquota = calcularAliquotaEfetiva(1412.00)

      // 105.90 / 1412 * 100 = 7.5%
      expect(aliquota).toBeCloseTo(7.50, 2)
    })

    it('deve ter alíquota efetiva maior para valores maiores', () => {
      const aliquota1 = calcularAliquotaEfetiva(1412)
      const aliquota2 = calcularAliquotaEfetiva(3000)
      const aliquota3 = calcularAliquotaEfetiva(5000)

      expect(aliquota2).toBeGreaterThan(aliquota1)
      expect(aliquota3).toBeGreaterThan(aliquota2)
    })
  })

  describe('calcularINSSSocios', () => {
    const sociosMock: Socio[] = [
      {
        id: '1',
        nome: 'João Silva',
        cpf: '111.111.111-11',
        percentual_participacao: 60,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      {
        id: '2',
        nome: 'Maria Santos',
        cpf: '222.222.222-22',
        percentual_participacao: 40,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ]

    it('deve distribuir pró-labore proporcionalmente entre sócios', () => {
      const resultado = calcularINSSSocios(10000, sociosMock)

      expect(resultado.valor_total_prolabore).toBe(10000)
      expect(resultado.socios).toHaveLength(2)
      expect(resultado.socios[0].valor_prolabore).toBe(6000) // 60%
      expect(resultado.socios[1].valor_prolabore).toBe(4000) // 40%
    })

    it('deve calcular INSS de cada sócio corretamente', () => {
      const resultado = calcularINSSSocios(10000, sociosMock)

      // Sócio 1 (R$ 6.000): INSS progressivo
      expect(resultado.socios[0].valor_inss).toBeGreaterThan(0)

      // Sócio 2 (R$ 4.000): INSS progressivo
      expect(resultado.socios[1].valor_inss).toBeGreaterThan(0)

      // Total deve ser a soma
      const somaINSS = resultado.socios[0].valor_inss + resultado.socios[1].valor_inss
      expect(resultado.total_inss).toBeCloseTo(somaINSS, 2)
    })

    it('deve incluir nome e ID dos sócios no resultado', () => {
      const resultado = calcularINSSSocios(10000, sociosMock)

      expect(resultado.socios[0].socio_id).toBe('1')
      expect(resultado.socios[0].nome).toBe('João Silva')
      expect(resultado.socios[1].socio_id).toBe('2')
      expect(resultado.socios[1].nome).toBe('Maria Santos')
    })

    it('deve funcionar com um único sócio', () => {
      const umSocio: Socio[] = [{
        id: '1',
        nome: 'Sócio Único',
        cpf: '111.111.111-11',
        percentual_participacao: 100,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }]

      const resultado = calcularINSSSocios(5000, umSocio)

      expect(resultado.socios).toHaveLength(1)
      expect(resultado.socios[0].valor_prolabore).toBe(5000)
    })

    it('deve lançar erro se a soma dos percentuais não for 100%', () => {
      const sociosInvalidos: Socio[] = [
        { ...sociosMock[0], percentual_participacao: 50 },
        { ...sociosMock[1], percentual_participacao: 30 },
      ]

      expect(() => calcularINSSSocios(10000, sociosInvalidos)).toThrow(
        'A soma dos percentuais deve ser 100%'
      )
    })

    it('deve lançar erro se não houver sócios', () => {
      expect(() => calcularINSSSocios(10000, [])).toThrow(
        'Deve haver pelo menos um sócio'
      )
    })

    it('deve lançar erro para valores negativos', () => {
      expect(() => calcularINSSSocios(-1000, sociosMock)).toThrow(
        'Valor total do pró-labore não pode ser negativo'
      )
    })
  })

  describe('calcularProlaboreMinimo', () => {
    it('deve calcular pró-labore mínimo corretamente', () => {
      const minimo = calcularProlaboreMinimo(2)

      expect(minimo).toBe(INSS_CONFIG.SALARIO_MINIMO * 2)
    })

    it('deve funcionar para um sócio', () => {
      const minimo = calcularProlaboreMinimo(1)

      expect(minimo).toBe(INSS_CONFIG.SALARIO_MINIMO)
    })

    it('deve lançar erro para zero sócios', () => {
      expect(() => calcularProlaboreMinimo(0)).toThrow(
        'Número de sócios deve ser maior que zero'
      )
    })

    it('deve lançar erro para valores negativos', () => {
      expect(() => calcularProlaboreMinimo(-1)).toThrow(
        'Número de sócios deve ser maior que zero'
      )
    })
  })
})
