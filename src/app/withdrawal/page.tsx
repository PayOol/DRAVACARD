import { SecureServiceUnavailable } from '@/components/security/secure-service-unavailable'

export default function WithdrawalPage() {
  return (
    <SecureServiceUnavailable
      service={{ fr: 'Retrait de fonds', en: 'Fund withdrawal' }}
    />
  )
}
