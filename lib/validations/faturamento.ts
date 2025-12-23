import { z } from 'zod'
import { isFutureDate } from '@/lib/services/ptax'

export const faturamentoSchema = z
  .object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato: YYYY-MM-DD)'),
    valor_bruto: z.number().min(0, 'Valor não pode ser negativo').optional(),
    exportacao: z.boolean().default(false),
    // Multi-currency fields (for exports)
    valor_usd: z.number().min(0, 'Valor USD não pode ser negativo').optional(),
    cotacao_ptax: z.number().min(0, 'Cotação PTAX deve ser maior que zero').optional(),
    valor_nota_fiscal: z.number().min(0, 'Valor NF não pode ser negativo').optional(),
    valor_recebido: z.number().min(0, 'Valor recebido não pode ser negativo').optional(),
  })
  .refine(
    (data) => {
      // For exports, date cannot be in the future
      if (data.exportacao) {
        return !isFutureDate(data.data)
      }
      return true
    },
    {
      message: 'Não é possível usar datas futuras para exportação',
      path: ['data'],
    }
  )
  .refine(
    (data) => {
      // For exports, USD and PTAX required; valor_recebido optional (can add later)
      if (data.exportacao) {
        return (
          data.valor_usd !== undefined &&
          data.cotacao_ptax !== undefined &&
          data.valor_nota_fiscal !== undefined
        )
      }
      return true
    },
    {
      message: 'Para exportação de serviços, valor USD e cotação PTAX são obrigatórios',
      path: ['exportacao'],
    }
  )
  .refine(
    (data) => {
      // For non-exports, valor_bruto is required
      if (!data.exportacao) {
        return data.valor_bruto !== undefined && data.valor_bruto > 0
      }
      return true
    },
    {
      message: 'Valor bruto é obrigatório',
      path: ['valor_bruto'],
    }
  )

export type FaturamentoInput = z.infer<typeof faturamentoSchema>
