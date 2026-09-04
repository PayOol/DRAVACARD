import { SecureServiceUnavailable } from '@/components/security/secure-service-unavailable'

export default function TopUpPage() {
  return (
    <SecureServiceUnavailable
      service={{ fr: 'Recharge de carte', en: 'Card top-up' }}
    />
  )
}
