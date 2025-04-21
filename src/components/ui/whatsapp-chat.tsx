"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageSquare } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const WhatsAppChat = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { language } = useLanguage()
  
  // WhatsApp phone number - replace with your actual business number
  const phoneNumber = "221783561562" // DRAVA business number
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) return
    
    setIsSubmitting(true)
    
    // Format the message with name and email if provided
    let formattedMessage = message
    if (name) {
      formattedMessage = `*${name}*: ${formattedMessage}`
    }
    if (email) {
      formattedMessage += `\n\n(Email: ${email})`
    }
    
    // Encode the message for the URL
    const encodedMessage = encodeURIComponent(formattedMessage)
    
    // Open WhatsApp with the pre-filled message
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank')
    
    // Reset form
    setMessage('')
    setIsSubmitting(false)
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Box */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl mb-4 w-80 sm:w-96 overflow-hidden transform transition-all duration-300 scale-100 origin-bottom-right">
          {/* Header */}
          <div className="bg-green-500 text-white p-4 flex justify-between items-center">
            <div className="flex items-center">
              <MessageSquare className="h-6 w-6 mr-2" />
              <h3 className="font-medium">
                {language === 'fr' ? 'Chat WhatsApp' : 'WhatsApp Chat'}
              </h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-green-600 rounded-full p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Chat Form */}
          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'fr' ? 'Votre nom (optionnel)' : 'Your name (optional)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={language === 'fr' ? 'Votre nom' : 'Your name'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'fr' ? 'Votre email (optionnel)' : 'Your email (optional)'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={language === 'fr' ? 'Votre email' : 'Your email'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'fr' ? 'Votre message' : 'Your message'}
                </label>
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={4}
                  placeholder={language === 'fr' ? 'Comment pouvons-nous vous aider?' : 'How can we help you?'}
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSubmitting ? (
                  language === 'fr' ? 'Envoi en cours...' : 'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Envoyer via WhatsApp' : 'Send via WhatsApp'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen ? 'rotate-90' : ''}`}
        aria-label={language === 'fr' ? 'Ouvrir le chat WhatsApp' : 'Open WhatsApp chat'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        )}
      </button>
    </div>
  )
}

export default WhatsAppChat
