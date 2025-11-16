interface PaymentBadgeProps {
  pago: boolean
  dataPagamento?: string | null
}

export function PaymentBadge({ pago, dataPagamento }: PaymentBadgeProps) {
  if (pago && dataPagamento) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Pago
      </span>
    )
  }

  if (pago && !dataPagamento) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        Pendente
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
      Não pago
    </span>
  )
}
