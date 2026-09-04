import { SecureServiceUnavailable } from '@/components/security/secure-service-unavailable'

export default function BalancePage() {
  return (
    <SecureServiceUnavailable
      service={{ fr: 'Consultation du solde', en: 'Balance check' }}
    />
  )
}
