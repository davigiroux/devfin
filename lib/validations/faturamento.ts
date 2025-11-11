import { z } from 'zod'

export const faturamentoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato: YYYY-MM-DD)'),
  valor_bruto: z.number().min(0, 'Valor não pode ser negativo'),
})

export type FaturamentoInput = z.infer<typeof faturamentoSchema>
