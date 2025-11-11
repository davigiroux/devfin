import {
  calcularImpostosLucroPresumido,
  getPercentualTotalImpostos,
  calcularValorLiquido,
  ALIQUOTAS,
} from '@/lib/calculations/impostos'

describe('Cálculo de Impostos - Lucro Presumido', () => {
  describe('calcularImpostosLucroPresumido', () => {
    it('deve calcular corretamente os impostos para R$ 100.000,00', () => {
      const resultado = calcularImpostosLucroPresumido(100000)

      expect(resultado.irpj).toBe(4800) // 4.8%
      expect(resultado.csll).toBe(2880) // 2.88%
      expect(resultado.pis).toBe(650) // 0.65%
      expect(resultado.cofins).toBe(3000) // 3%
      expect(resultado.total).toBe(11330) // Soma total
    })

    it('deve calcular corretamente os impostos para R$ 50.000,00', () => {
      const resultado = calcularImpostosLucroPresumido(50000)

      expect(resultado.irpj).toBe(2400)
      expect(resultado.csll).toBe(1440)
      expect(resultado.pis).toBe(325)
      expect(resultado.cofins).toBe(1500)
      expect(resultado.total).toBe(5665)
    })

    it('deve retornar zero para faturamento zero', () => {
      const resultado = calcularImpostosLucroPresumido(0)

      expect(resultado.irpj).toBe(0)
      expect(resultado.csll).toBe(0)
      expect(resultado.pis).toBe(0)
      expect(resultado.cofins).toBe(0)
      expect(resultado.total).toBe(0)
    })

    it('deve arredondar corretamente os valores decimais', () => {
      const resultado = calcularImpostosLucroPresumido(12345.67)

      // Valores esperados com arredondamento para 2 casas decimais
      expect(resultado.irpj).toBe(592.59)
      expect(resultado.csll).toBe(355.56) // 12345.67 * 0.0288 = 355.555616
      expect(resultado.pis).toBe(80.25)
      expect(resultado.cofins).toBe(370.37)
      expect(resultado.total).toBe(1398.77) // Soma arredondada
    })

    it('deve lançar erro para valores negativos', () => {
      expect(() => calcularImpostosLucroPresumido(-1000)).toThrow(
        'Valor bruto não pode ser negativo'
      )
    })

    it('deve lançar erro para valores inválidos', () => {
      expect(() => calcularImpostosLucroPresumido(NaN)).toThrow(
        'Valor bruto deve ser um número válido'
      )
      expect(() => calcularImpostosLucroPresumido(Infinity)).toThrow(
        'Valor bruto deve ser um número válido'
      )
    })

    it('deve respeitar as alíquotas definidas', () => {
      const valorTeste = 10000
      const resultado = calcularImpostosLucroPresumido(valorTeste)

      expect(resultado.irpj).toBe(valorTeste * ALIQUOTAS.IRPJ)
      expect(resultado.csll).toBe(valorTeste * ALIQUOTAS.CSLL)
      expect(resultado.pis).toBe(valorTeste * ALIQUOTAS.PIS)
      expect(resultado.cofins).toBe(valorTeste * ALIQUOTAS.COFINS)
    })
  })

  describe('getPercentualTotalImpostos', () => {
    it('deve retornar o percentual total correto', () => {
      const percentual = getPercentualTotalImpostos()

      // 4.8% + 2.88% + 0.65% + 3% = 11.33%
      expect(percentual).toBeCloseTo(0.1133, 4)
    })
  })

  describe('calcularValorLiquido', () => {
    it('deve calcular corretamente o valor líquido após impostos', () => {
      const valorBruto = 100000
      const valorLiquido = calcularValorLiquido(valorBruto)

      // R$ 100.000 - R$ 11.330 = R$ 88.670
      expect(valorLiquido).toBe(88670)
    })

    it('deve retornar zero quando faturamento é zero', () => {
      const valorLiquido = calcularValorLiquido(0)
      expect(valorLiquido).toBe(0)
    })

    it('deve calcular corretamente para valores decimais', () => {
      const valorBruto = 12345.67
      const impostos = calcularImpostosLucroPresumido(valorBruto)
      const valorLiquido = calcularValorLiquido(valorBruto)

      expect(valorLiquido).toBe(10946.9) // 12345.67 - 1398.77 = 10946.9
    })
  })
})
