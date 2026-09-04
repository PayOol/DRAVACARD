import { SecureServiceUnavailable } from '@/components/security/secure-service-unavailable'

export default function PaymentSuccessPage() {
  return (
    <SecureServiceUnavailable
      service={{ fr: 'Confirmation du paiement', en: 'Payment confirmation' }}
      message={{
        fr: "Cette page ne peut pas confirmer qu'un paiement a réussi. Seule une vérification serveur signée par le prestataire peut valider une transaction.",
        en: 'This page cannot confirm that a payment succeeded. Only a server-side verification signed by the provider can validate a transaction.',
      }}
    />
  )
}
