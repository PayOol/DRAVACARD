"use client"

import { Star } from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLanguage } from '@/lib/language-context'

const TestimonialsSection = () => {
  const { language } = useLanguage();

  const testimonials = [
    {
      name: "Jean Dupont",
      role: {
        fr: "E-commerce Entrepreneur",
        en: "E-commerce Entrepreneur"
      },
      content: {
        fr: "DRAVA a transformé ma façon de gérer les paiements en ligne. Les cartes virtuelles sont faciles à créer et à utiliser, et le service client est exceptionnel.",
        en: "DRAVA has transformed the way I manage online payments. The virtual cards are easy to create and use, and the customer service is exceptional."
      },
      rating: 5,
      location: {
        fr: "Sénégal",
        en: "Senegal"
      }
    },
    {
      name: "Marie Koné",
      role: {
        fr: "Freelance Designer",
        en: "Freelance Designer"
      },
      content: {
        fr: "Les cartes DRAVA sont un excellent moyen de gérer mes dépenses en ligne. Je recommande !",
        en: "DRAVA cards are an excellent way to manage my online spending. I recommend!"
      },
      rating: 5,
      location: {
        fr: "Côte d'Ivoire",
        en: "Ivory Coast"
      }
    },
    {
      name: "Robert Nkosi",
      role: {
        fr: "Développeur Web",
        en: "Web Developer"
      },
      content: {
        fr: "Depuis que j'utilise DRAVA, mes achats en ligne sont beaucoup plus sécurisés.",
        en: "Since I started using DRAVA, my online purchases are much more secure."
      },
      rating: 4,
      location: {
        fr: "Cameroun",
        en: "Cameroon"
      }
    },
    {
      name: "Aïcha Diallo",
      role: {
        fr: "Étudiante",
        en: "Student"
      },
      content: {
        fr: "J'utilise DRAVA pour mes abonnements en ligne et mes achats sur les plateformes internationales. Le processus est simple et sans tracas !",
        en: "I use DRAVA for my online subscriptions and purchases on international platforms. The process is simple and hassle-free!"
      },
      rating: 5,
      location: {
        fr: "Mali",
        en: "Mali"
      }
    },
    {
      name: "Thomas Mensah",
      role: {
        fr: "Petit Commerçant",
        en: "Small Business Owner"
      },
      content: {
        fr: "DRAVA m'a permis de développer mon business en ligne. Service client au top !",
        en: "DRAVA has helped me grow my online business. Great customer service!"
      },
      rating: 4,
      location: {
        fr: "Ghana",
        en: "Ghana"
      }
    }
  ];

  const RatingStars = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  return (
    <section className="py-16 md:py-24 bg-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {language === 'fr' ? (
              <>Ce que nos clients <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">disent de nous</span></>
            ) : (
              <>What our customers <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">say about us</span></>
            )}
          </h2>
          <p className="text-lg text-gray-600">
            {language === 'fr'
              ? "Des milliers de clients nous font confiance pour leurs paiements en ligne. Voici quelques-uns de leurs témoignages."
              : "Thousands of customers trust us for their online payments. Here are some of their testimonials."}
          </p>
        </div>

        <Carousel className="mx-auto max-w-5xl">
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={testimonial.name} className="md:basis-1/2 lg:basis-1/3 pl-4">
                <Card className="h-full border border-gray-100">
                  <CardContent className="p-6 flex flex-col h-full">
                    <RatingStars rating={testimonial.rating} />

                    <blockquote className="mt-4 mb-6 flex-grow">
                      <p className="text-gray-700">{testimonial.content[language]}</p>
                    </blockquote>

                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarFallback className="bg-blue-100 text-blue-800">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-gray-500">
                          {testimonial.role[language]} • {testimonial.location[language]}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center mt-8">
            <CarouselPrevious className="relative static mr-2 translate-x-0 translate-y-0" />
            <CarouselNext className="relative static ml-2 translate-x-0 translate-y-0" />
          </div>
        </Carousel>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">500k+</div>
            <p className="text-gray-600">{language === 'fr' ? 'Utilisateurs actifs' : 'Active users'}</p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">14</div>
            <p className="text-gray-600">{language === 'fr' ? 'Pays couverts' : 'Countries covered'}</p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">24/7</div>
            <p className="text-gray-600">{language === 'fr' ? 'Support client' : 'Customer support'}</p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">4.8/5</div>
            <p className="text-gray-600">{language === 'fr' ? 'Note moyenne' : 'Average rating'}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection
