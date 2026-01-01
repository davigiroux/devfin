import { generateNFDescription } from '@/lib/services/nf-description'
import { Faturamento } from '@/types'

describe('NF Description Generator', () => {
  const mockFaturamento: Faturamento = {
    id: '123',
    data: '2024-11-24',
    valor_bruto: 27088.75,
    irpj: 1300.26,
    csll: 780.16,
    pis: 0,
    cofins: 0,
    total_impostos: 2080.42,
    exportacao: true,
    valor_usd: 5021.40,
    cotacao_ptax: 5.3948,
    valor_nota_fiscal: 27088.75,
    valor_recebido: 27500.00,
    usuario_id: 'user123',
    created_at: '2024-11-24T00:00:00Z',
    updated_at: '2024-11-24T00:00:00Z',
  }

  describe('generateNFDescription', () => {
    it('deve gerar descrição completa com todos os campos', () => {
      const description = generateNFDescription(mockFaturamento)

      expect(description).toContain('Kake Group LLC')
      expect(description).toContain('BTG Pactual S.A. (208)')
      expect(description).toContain('Agência: 0001')
      expect(description).toContain('Conta: 01785055-3')
      expect(description).toContain('Vencimento: 30/11/2024') // Last day of November
      expect(description).toContain('$ 5,021.40 USD')
      expect(description).toContain('convertido no dia 24/11/2024')
      expect(description).toContain('R$ 5.3948')
    })

    it('deve formatar USD com 2 casas decimais e separador de milhares', () => {
      const description = generateNFDescription(mockFaturamento)
      expect(description).toContain('$ 5,021.40 USD')
    })

    it('deve formatar PTAX com 4 casas decimais', () => {
      const description = generateNFDescription(mockFaturamento)
      expect(description).toContain('R$ 5.3948')
    })

    it('deve formatar data de conversão como DD/MM/YYYY', () => {
      const description = generateNFDescription(mockFaturamento)
      expect(description).toContain('convertido no dia 24/11/2024')
    })

    it('deve calcular vencimento como último dia do mês', () => {
      const description = generateNFDescription(mockFaturamento)
      expect(description).toContain('Vencimento: 30/11/2024')
    })

    it('deve calcular corretamente último dia de meses com 31 dias', () => {
      const faturamento = { ...mockFaturamento, data: '2024-01-15' }
      const description = generateNFDescription(faturamento)
      expect(description).toContain('Vencimento: 31/01/2024')
    })

    it('deve calcular corretamente último dia de fevereiro (ano não bissexto)', () => {
      const faturamento = { ...mockFaturamento, data: '2023-02-10' }
      const description = generateNFDescription(faturamento)
      expect(description).toContain('Vencimento: 28/02/2023')
    })

    it('deve calcular corretamente último dia de fevereiro (ano bissexto)', () => {
      const faturamento = { ...mockFaturamento, data: '2024-02-10' }
      const description = generateNFDescription(faturamento)
      expect(description).toContain('Vencimento: 29/02/2024')
    })

    it('deve calcular corretamente último dia de meses com 30 dias', () => {
      const faturamento = { ...mockFaturamento, data: '2024-04-15' }
      const description = generateNFDescription(faturamento)
      expect(description).toContain('Vencimento: 30/04/2024')
    })

    it('deve lançar erro quando valor_usd está ausente', () => {
      const faturamento = { ...mockFaturamento, valor_usd: null }
      expect(() => generateNFDescription(faturamento)).toThrow(
        'Faturamento must have valor_usd and cotacao_ptax'
      )
    })

    it('deve lançar erro quando cotacao_ptax está ausente', () => {
      const faturamento = { ...mockFaturamento, cotacao_ptax: null }
      expect(() => generateNFDescription(faturamento)).toThrow(
        'Faturamento must have valor_usd and cotacao_ptax'
      )
    })

    it('deve formatar corretamente valores USD grandes', () => {
      const faturamento = {
        ...mockFaturamento,
        valor_usd: 123456.78,
        cotacao_ptax: 5.1234,
      }
      const description = generateNFDescription(faturamento)
      expect(description).toContain('$ 123,456.78 USD')
      expect(description).toContain('R$ 5.1234')
    })

    it('deve manter estrutura completa do template', () => {
      const description = generateNFDescription(mockFaturamento)

      // Verifica que todas as seções principais existem
      expect(description).toContain('Serviços prestados conforme acordado em contrato')
      expect(description).toContain('desenvolvimento e manutenção de software')
      expect(description).toContain('Dados Bancários')
      expect(description).toContain('Banco:')
      expect(description).toContain('Agência:')
      expect(description).toContain('Conta:')
      expect(description).toContain('Vencimento:')
      expect(description).toContain('Valor de $')
      expect(description).toContain('convertido no dia')
      expect(description).toContain('utilizando o dólar PTAX de venda na cotação')
    })

    it('deve separar seções com quebras de linha', () => {
      const description = generateNFDescription(mockFaturamento)

      // Verifica que há quebras de linha entre seções
      expect(description).toMatch(/LLC\.\s*\n\s*\nDados Bancários/)
      expect(description).toMatch(/Conta: 01785055-3\s*\n\s*\nVencimento:/)
    })
  })
})
