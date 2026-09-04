import { SecureServiceUnavailable } from '@/components/security/secure-service-unavailable'

export default function CardsPage() {
  return (
    <SecureServiceUnavailable
      service={{ fr: 'Achat de cartes', en: 'Card purchase' }}
    />
  )
}
