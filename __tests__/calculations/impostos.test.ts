import {
  calcularImpostosLucroPresumido,
  getPercentualTotalImpostos,
  calcularValorLiquido,
  calcularSaldoLiquidoExportacao,
  ALIQUOTAS,
} from '@/lib/calculations/impostos'
import { calcularValorNotaFiscal, isPastDate } from '@/lib/services/ptax'

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

  describe('Exportação de Serviços (isenção de PIS e COFINS)', () => {
    describe('calcularImpostosLucroPresumido com exportacao=true', () => {
      it('deve isentar PIS e COFINS para exportação de R$ 100.000,00', () => {
        const resultado = calcularImpostosLucroPresumido(100000, true)

        expect(resultado.irpj).toBe(4800) // 4.8% - mantém
        expect(resultado.csll).toBe(2880) // 2.88% - mantém
        expect(resultado.pis).toBe(0) // isento
        expect(resultado.cofins).toBe(0) // isento
        expect(resultado.total).toBe(7680) // Apenas IRPJ + CSLL
      })

      it('deve isentar PIS e COFINS para exportação de R$ 50.000,00', () => {
        const resultado = calcularImpostosLucroPresumido(50000, true)

        expect(resultado.irpj).toBe(2400)
        expect(resultado.csll).toBe(1440)
        expect(resultado.pis).toBe(0)
        expect(resultado.cofins).toBe(0)
        expect(resultado.total).toBe(3840)
      })

      it('deve retornar zero para faturamento zero mesmo com exportação', () => {
        const resultado = calcularImpostosLucroPresumido(0, true)

        expect(resultado.irpj).toBe(0)
        expect(resultado.csll).toBe(0)
        expect(resultado.pis).toBe(0)
        expect(resultado.cofins).toBe(0)
        expect(resultado.total).toBe(0)
      })

      it('deve arredondar corretamente com exportação', () => {
        const resultado = calcularImpostosLucroPresumido(12345.67, true)

        expect(resultado.irpj).toBe(592.59)
        expect(resultado.csll).toBe(355.56)
        expect(resultado.pis).toBe(0)
        expect(resultado.cofins).toBe(0)
        expect(resultado.total).toBe(948.15) // 592.59 + 355.56
      })

      it('deve manter validação de valores negativos com exportação', () => {
        expect(() => calcularImpostosLucroPresumido(-1000, true)).toThrow(
          'Valor bruto não pode ser negativo'
        )
      })

      it('deve manter validação de valores inválidos com exportação', () => {
        expect(() => calcularImpostosLucroPresumido(NaN, true)).toThrow(
          'Valor bruto deve ser um número válido'
        )
      })
    })

    describe('getPercentualTotalImpostos com exportacao=true', () => {
      it('deve retornar percentual sem PIS e COFINS para exportação', () => {
        const percentual = getPercentualTotalImpostos(true)

        // 4.8% + 2.88% = 7.68%
        expect(percentual).toBeCloseTo(0.0768, 4)
      })

      it('deve retornar percentual completo para operação nacional', () => {
        const percentual = getPercentualTotalImpostos(false)

        // 4.8% + 2.88% + 0.65% + 3% = 11.33%
        expect(percentual).toBeCloseTo(0.1133, 4)
      })
    })

    describe('calcularValorLiquido com exportacao=true', () => {
      it('deve calcular valor líquido com isenção de PIS e COFINS', () => {
        const valorBruto = 100000
        const valorLiquido = calcularValorLiquido(valorBruto, true)

        // R$ 100.000 - R$ 7.680 = R$ 92.320
        expect(valorLiquido).toBe(92320)
      })

      it('deve calcular corretamente para valores decimais com exportação', () => {
        const valorBruto = 12345.67
        const valorLiquido = calcularValorLiquido(valorBruto, true)

        expect(valorLiquido).toBe(11397.52) // 12345.67 - 948.15 = 11397.52
      })
    })
  })

  describe('Multi-Currency (USD → BRL)', () => {
    describe('calcularValorNotaFiscal', () => {
      it('deve calcular valor NF corretamente (USD × PTAX)', () => {
        const valorUSD = 10000
        const cotacaoPTAX = 5.25
        const valorNF = calcularValorNotaFiscal(valorUSD, cotacaoPTAX)

        expect(valorNF).toBe(52500) // 10000 * 5.25
      })

      it('deve arredondar para 2 casas decimais', () => {
        const valorUSD = 1234.56
        const cotacaoPTAX = 5.4321
        const valorNF = calcularValorNotaFiscal(valorUSD, cotacaoPTAX)

        expect(valorNF).toBe(6706.25) // 1234.56 * 5.4321 with floating point precision
      })

      it('deve retornar 0 quando USD é 0', () => {
        const valorNF = calcularValorNotaFiscal(0, 5.25)
        expect(valorNF).toBe(0)
      })

      it('deve retornar 0 quando PTAX é 0', () => {
        const valorNF = calcularValorNotaFiscal(10000, 0)
        expect(valorNF).toBe(0)
      })
    })

    describe('calcularSaldoLiquidoExportacao', () => {
      it('deve calcular saldo líquido corretamente (valor_recebido - impostos)', () => {
        const valorNotaFiscal = 100000 // Base para impostos
        const valorRecebido = 95000 // Valor real recebido (menor devido a fees)
        const saldoLiquido = calcularSaldoLiquidoExportacao(valorNotaFiscal, valorRecebido)

        // Impostos sobre 100k: 7680 (IRPJ + CSLL only)
        // Saldo: 95000 - 7680 = 87320
        expect(saldoLiquido).toBe(87320)
      })

      it('deve usar apenas IRPJ e CSLL (PIS e COFINS isentos)', () => {
        const valorNotaFiscal = 50000
        const valorRecebido = 48000
        const saldoLiquido = calcularSaldoLiquidoExportacao(valorNotaFiscal, valorRecebido)

        // Impostos sobre 50k: 3840 (IRPJ 2400 + CSLL 1440)
        // Saldo: 48000 - 3840 = 44160
        expect(saldoLiquido).toBe(44160)
      })

      it('deve calcular corretamente quando valor_recebido > valor_nota_fiscal', () => {
        const valorNotaFiscal = 100000
        const valorRecebido = 105000 // Cotação melhor que PTAX
        const saldoLiquido = calcularSaldoLiquidoExportacao(valorNotaFiscal, valorRecebido)

        // Impostos sobre 100k: 7680
        // Saldo: 105000 - 7680 = 97320
        expect(saldoLiquido).toBe(97320)
      })

      it('deve retornar valor negativo quando impostos > valor_recebido', () => {
        const valorNotaFiscal = 100000
        const valorRecebido = 5000 // Muito baixo
        const saldoLiquido = calcularSaldoLiquidoExportacao(valorNotaFiscal, valorRecebido)

        // Impostos: 7680, Recebido: 5000
        // Saldo: 5000 - 7680 = -2680
        expect(saldoLiquido).toBe(-2680)
      })

      it('deve arredondar para 2 casas decimais', () => {
        const valorNotaFiscal = 12345.67
        const valorRecebido = 12000.00
        const saldoLiquido = calcularSaldoLiquidoExportacao(valorNotaFiscal, valorRecebido)

        // Impostos sobre 12345.67: 948.15
        // Saldo: 12000 - 948.15 = 11051.85
        expect(saldoLiquido).toBe(11051.85)
      })
    })

    describe('isPastDate', () => {
      it('deve retornar true para data passada', () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const dateString = yesterday.toISOString().split('T')[0]

        expect(isPastDate(dateString)).toBe(true)
      })

      it('deve retornar false para data de hoje', () => {
        const today = new Date().toISOString().split('T')[0]
        expect(isPastDate(today)).toBe(false)
      })

      it('deve retornar false para data futura', () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateString = tomorrow.toISOString().split('T')[0]

        expect(isPastDate(dateString)).toBe(false)
      })
    })

    describe('Fluxo completo: USD → PTAX → NF → Impostos → Saldo', () => {
      it('deve calcular corretamente todo o fluxo', () => {
        // Cenário: $10,000 USD com PTAX 5.50, recebeu R$ 54,000
        const valorUSD = 10000
        const cotacaoPTAX = 5.50
        const valorRecebido = 54000

        // 1. Calcular valor NF
        const valorNF = calcularValorNotaFiscal(valorUSD, cotacaoPTAX)
        expect(valorNF).toBe(55000) // 10000 * 5.50

        // 2. Calcular impostos sobre valor NF
        const impostos = calcularImpostosLucroPresumido(valorNF, true)
        expect(impostos.irpj).toBe(2640) // 55000 * 0.048
        expect(impostos.csll).toBe(1584) // 55000 * 0.0288
        expect(impostos.pis).toBe(0) // Isento
        expect(impostos.cofins).toBe(0) // Isento
        expect(impostos.total).toBe(4224) // 2640 + 1584

        // 3. Calcular saldo líquido
        const saldoLiquido = calcularSaldoLiquidoExportacao(valorNF, valorRecebido)
        expect(saldoLiquido).toBe(49776) // 54000 - 4224
      })

      it('deve calcular corretamente com cotação desfavorável', () => {
        // Cenário: $5,000 USD com PTAX 6.00, mas recebeu apenas R$ 28,000 (fees altos)
        const valorUSD = 5000
        const cotacaoPTAX = 6.00
        const valorRecebido = 28000

        const valorNF = calcularValorNotaFiscal(valorUSD, cotacaoPTAX)
        expect(valorNF).toBe(30000)

        const impostos = calcularImpostosLucroPresumido(valorNF, true)
        expect(impostos.total).toBe(2304) // IRPJ 1440 + CSLL 864

        const saldoLiquido = calcularSaldoLiquidoExportacao(valorNF, valorRecebido)
        expect(saldoLiquido).toBe(25696) // 28000 - 2304
      })
    })
  })
})
