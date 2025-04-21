"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageSquare, User, Mail, ChevronRight, Check } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const WhatsAppChat = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { language } = useLanguage()
  
  // WhatsApp phone number - replace with your actual business number
  const phoneNumber = "+237696161186" // DRAVA business number
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setIsSent(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    
    // Format the message with name and email if provided
    let formattedMessage = message;
    if (name) {
      formattedMessage = `*${name}*: ${formattedMessage}`;
    }
    if (email) {
      formattedMessage += `\n\n(Email: ${email})`;
    }
    
    try {
      // Encode the message for the URL
      const encodedMessage = encodeURIComponent(formattedMessage);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
      
      // Create a hidden iframe to load the WhatsApp URL without redirecting
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Set iframe source to the WhatsApp URL
      iframe.src = whatsappUrl;
      
      // Show success message
      setIsSent(true);
      
      // Remove iframe after a delay
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        
        // Reset form after showing success message
        setTimeout(() => {
          setMessage('');
          setIsSubmitting(false);
        }, 2000);
      }, 1000);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      setIsSubmitting(false);
      
      // Fallback: open in new window but keep focus on current page
      const newWindow = window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(formattedMessage)}`, '_blank');
      if (newWindow) {
        newWindow.blur();
        window.focus();
      }
      
      setIsSent(true);
      setTimeout(() => {
        setMessage('');
        setIsSubmitting(false);
      }, 2000);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Box */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl mb-4 w-80 sm:w-96 overflow-hidden transform transition-all duration-300 scale-100 origin-bottom-right border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-sm">DRAVA Support</h3>
                <p className="text-xs text-white/80">{language === 'fr' ? 'En ligne' : 'Online'}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Chat Form */}
          <form onSubmit={handleSubmit} className="p-5">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder={language === 'fr' ? 'Votre nom (optionnel)' : 'Your name (optional)'}
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder={language === 'fr' ? 'Votre email (optionnel)' : 'Your email (optional)'}
                />
              </div>
              
              <div>
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  rows={3}
                  placeholder={language === 'fr' ? 'Comment pouvons-nous vous aider?' : 'How can we help you?'}
                  required
                  disabled={isSent}
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !message.trim() || isSent}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {language === 'fr' ? 'Envoi en cours...' : 'Sending...'}
                  </span>
                ) : isSent ? (
                  <span className="flex items-center text-white">
                    <Check className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Message envoyé!' : 'Message sent!'}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Envoyer via WhatsApp' : 'Send via WhatsApp'}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </span>
                )}
              </button>
              
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                {isSent ? (
                  language === 'fr' 
                    ? 'Nous vous répondrons dès que possible' 
                    : 'We will respond as soon as possible'
                ) : (
                  language === 'fr' 
                    ? 'Votre message sera envoyé via WhatsApp' 
                    : 'Your message will be sent via WhatsApp'
                )}
              </div>
            </div>
          </form>
        </div>
      )}
      
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-green-500 hover:bg-green-600 text-white rounded-full p-3.5 shadow-lg flex items-center justify-center transition-all duration-300 relative group ${isOpen ? 'rotate-90' : ''}`}
        aria-label={language === 'fr' ? 'Ouvrir le chat WhatsApp' : 'Open WhatsApp chat'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <div className="relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" className="animate-pulse">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">1</span>
            </div>
            
            {/* Enhanced Pulsation Animations */}
            <div className="absolute inset-0 rounded-full bg-white/30 animate-ping"></div>
            <div className="absolute -inset-1 rounded-full border-2 border-white/40 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            <div className="absolute -inset-2 rounded-full border-2 border-white/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            <div className="absolute -inset-3 rounded-full border-2 border-white/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            
            {/* Rotating Elements */}
            <div className="absolute -inset-4 rounded-full border border-white/10 animate-[spin_10s_linear_infinite]"></div>
          </>
        )}
      </button>
    </div>
  )
}

export default WhatsAppChat
