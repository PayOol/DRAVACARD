import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Analyser le corps de la requête
    const body = await request.json();
    const { email, language } = body;

    // Validation basique de l'email
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email requis' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Format email invalide' },
        { status: 400 }
      );
    }

    // Dans un environnement de production, ici nous ferions un appel à un service comme:
    // - Mailchimp, SendGrid, ConvertKit, etc.
    // - Ou enregistrerions l'email dans une base de données

    // Pour le moment, nous utilisons FormSubmit comme solution temporaire
    const formData = new FormData();
    formData.append('_subject', 'Nouvelle inscription newsletter DRAVA');
    formData.append('email', email);
    formData.append('_template', 'table');
    formData.append('_captcha', 'false');

    const response = await fetch('https://formsubmit.co/support@drava.net', {
      method: 'POST',
      body: formData,
    });

    // Pour l'exemple, simulons un succès avec un délai
    await new Promise(resolve => setTimeout(resolve, 500));

    // Répondre avec succès
    return NextResponse.json({
      success: true,
      message: language === 'fr'
        ? "Merci de votre inscription à la newsletter DRAVA !"
        : "Thank you for subscribing to DRAVA newsletter!",
      email
    });
  } catch (error) {
    console.error('Erreur newsletter:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du traitement de la demande' },
      { status: 500 }
    );
  }
}
