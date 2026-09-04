import { SecureServiceUnavailable } from '@/components/security/secure-service-unavailable'

export default function PaymentFailurePage() {
  return (
    <SecureServiceUnavailable
      service={{ fr: 'Statut du paiement', en: 'Payment status' }}
      message={{
        fr: "Cette page ne peut pas déterminer le statut d'un paiement. Contactez le support sans transmettre de numéro de carte, de CVV ou de secret de paiement.",
        en: 'This page cannot determine a payment status. Contact support without sending a card number, CVV, or payment secret.',
      }}
    />
  )
}
