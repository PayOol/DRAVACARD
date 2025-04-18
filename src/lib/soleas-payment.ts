// Service d'intégration de SoleasPay selon la documentation officielle
// Pour toute question: contact.drava@gmail.com

import { Language } from './translations';

interface CardPaymentDetails {
  name: string;
  price: string;
  currency: string;
}

interface PaymentGatewayResponse {
  success: boolean;
  message: string;
  formHtml?: string;
}

// Configuration de l'API
const SOLEAS_API_KEY = 'qSvT4NCUKKg2oqZvNCkgZAFpiiWKJC9W_Dj4RgbNtZI';
const SOLEAS_CHECKOUT_URL = 'https://checkout.soleaspay.com';

// Fonction utilitaire pour obtenir le texte selon la langue
const getText = (lang: Language | null, text: { fr: string; en: string }): string => {
  if (!lang || lang === 'fr') {
    return text.fr;
  }
  return text.en;
};

/**
 * Crée un formulaire HTML pour la passerelle de paiement SoleasPay
 * @param cardDetails Détails de la carte sélectionnée
 * @param shopName Nom de la boutique
 * @param orderId Identifiant de la commande
 * @param successUrl URL de redirection en cas de succès
 * @param failureUrl URL de redirection en cas d'échec
 * @param customerEmail Email du client à préremplir dans le formulaire
 * @param language Langue actuelle (fr ou en)
 * @returns Promise avec la réponse contenant le HTML du formulaire
 */
export async function createPaymentGateway(
  cardDetails: CardPaymentDetails,
  shopName = 'DRAVA Cards',
  orderId = `ORDER-${Date.now()}`,
  successUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/payment-success`,
  failureUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/payment-failure`,
  customerEmail = '',
  language: Language = 'fr'
): Promise<PaymentGatewayResponse> {
  try {
    console.log('Creating SoleasPay payment form...');

    // Mettre le montant au bon format
    const amount = Number.parseInt(cardDetails.price, 10);

    // Traductions des textes du formulaire
    const texts = {
      yourEmail: {
        fr: 'Votre email',
        en: 'Your email'
      },
      yourName: {
        fr: 'Votre nom',
        en: 'Your name'
      },
      proceedToPayment: {
        fr: 'Procéder au paiement',
        en: 'Proceed to payment'
      },
      cardPurchase: {
        fr: 'Achat de carte',
        en: 'Card purchase'
      },
      formGeneratedSuccess: {
        fr: 'Formulaire de paiement généré avec succès',
        en: 'Payment form generated successfully'
      },
      formGenerationError: {
        fr: 'Erreur lors de la création du formulaire de paiement',
        en: 'Error creating payment form'
      }
    };

    // Configuration du champ email basé sur si un email est fourni
    const emailField = customerEmail
      ? `
        <input name="customer[email]" type="hidden" value="${customerEmail}">
        <div class="form-group mb-3">
          <label class="mb-1 font-medium">${getText(language, texts.yourEmail)}</label>
          <div class="w-full p-2 border rounded bg-gray-50 text-gray-600">${customerEmail}</div>
        </div>
      `
      : `
        <div class="form-group mb-3">
          <label for="customer-email" class="mb-1 font-medium">${getText(language, texts.yourEmail)}</label>
          <input id="customer-email" name="customer[email]" type="email" class="w-full p-2 border rounded" required />
        </div>
      `;

    // Création du formulaire HTML selon la documentation SoleasPay
    const formHtml = `
      <form id="soleaspay-form" action="${SOLEAS_CHECKOUT_URL}" method="post">
        <div class="form-group mb-3">
          <label for="customer-name" class="mb-1 font-medium">${getText(language, texts.yourName)}</label>
          <input id="customer-name" name="customer[name]" type="text" class="w-full p-2 border rounded" required />
        </div>
        ${emailField}

        <input name="amount" type="number" value="${amount}" hidden />
        <input name="currency" type="text" value="XAF" hidden />
        <input name="description" type="text" value="${getText(language, texts.cardPurchase)} ${cardDetails.name}" hidden />
        <input name="orderId" type="text" value="${orderId}" hidden />
        <input name="shopName" type="hidden" value="${shopName}" />
        <input name="apiKey" type="hidden" value="${SOLEAS_API_KEY}" />
        <input name="successUrl" type="url" value="${successUrl}" hidden />
        <input name="failureUrl" type="url" value="${failureUrl}" hidden />
        <input name="line" type="text" value="up" hidden />

        <button type="submit" class="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded hover:bg-blue-700">
          ${getText(language, texts.proceedToPayment)}
        </button>
      </form>
    `;

    console.log('Payment form HTML generated successfully');

    return {
      success: true,
      message: getText(language, texts.formGeneratedSuccess),
      formHtml: formHtml
    };
  } catch (error) {
    console.error('Error creating payment form:', error);
    return {
      success: false,
      message: getText(language as Language, {
        fr: 'Erreur lors de la création du formulaire de paiement',
        en: 'Error creating payment form'
      })
    };
  }
}

/**
 * Soumet le formulaire de paiement SoleasPay après ajout au DOM
 * @param formHtml HTML du formulaire à soumettre
 */
export function submitPaymentForm(formHtml: string): void {
  if (typeof window === 'undefined') {
    console.error('Cette fonction doit être exécutée côté client');
    return;
  }

  try {
    // Détecter la langue actuelle
    const language: Language = (localStorage.getItem('language') as Language) || 'fr';

    // Traductions
    const texts = {
      soleaspayPayment: { fr: 'Paiement SoleasPay', en: 'SoleasPay Payment' }
    };

    // Créer une modal pour afficher le formulaire
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    // Créer le contenu de la modal
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.borderRadius = '8px';
    modalContent.style.padding = '20px';
    modalContent.style.width = '90%';
    modalContent.style.maxWidth = '500px';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflow = 'auto';
    modalContent.style.position = 'relative';

    // Créer le titre
    const title = document.createElement('h2');
    title.textContent = getText(language, texts.soleaspayPayment);
    title.style.textAlign = 'center';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '20px';

    // Créer le bouton de fermeture
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(modal);

    // Créer un conteneur pour le formulaire
    const formContainer = document.createElement('div');
    formContainer.innerHTML = formHtml;

    // Ajouter le contenu à la modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(formContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Ne pas soumettre automatiquement pour laisser l'utilisateur remplir les champs
    console.log('Payment form displayed for user input');
  } catch (error) {
    console.error('Erreur lors de l\'affichage du formulaire:', error);
  }
}

/**
 * Ouvre une fenêtre modale contenant un iframe avec le formulaire SoleasPay
 * @param cardDetails Détails de la carte
 * @param shopName Nom de la boutique
 * @param customerEmail Email du client à préremplir dans le formulaire
 */
export function openPaymentModal(
  cardDetails: CardPaymentDetails,
  shopName = 'DRAVA Cards',
  customerEmail = ''
): void {
  if (typeof window === 'undefined') return;

  // Détecter la langue actuelle
  const language: Language = (localStorage.getItem('language') as Language) || 'fr';

  // Traductions
  const texts = {
    soleaspayPayment: { fr: 'Paiement SoleasPay', en: 'SoleasPay Payment' },
    yourName: { fr: 'Votre nom', en: 'Your name' },
    yourEmail: { fr: 'Votre email', en: 'Your email' },
    proceedToPayment: { fr: 'Procéder au paiement', en: 'Proceed to payment' },
    cardPurchase: { fr: 'Achat de carte', en: 'Card purchase' }
  };

  const amount = Number.parseInt(cardDetails.price, 10);
  const orderId = `ORDER-${Date.now()}`;
  const successUrl = `${window.location.origin}/payment-success`;
  const failureUrl = `${window.location.origin}/payment-failure`;

  // Créer la fenêtre modale
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.zIndex = '9999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  // Créer le contenu de la modal
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '8px';
  modalContent.style.width = '90%';
  modalContent.style.maxWidth = '500px';
  modalContent.style.maxHeight = '90vh';
  modalContent.style.overflow = 'auto';
  modalContent.style.position = 'relative';

  // Créer le bouton de fermeture
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.border = 'none';
  closeButton.style.background = 'none';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = () => document.body.removeChild(modal);

  // Créer un conteneur pour le formulaire SoleasPay intégré
  const formContainer = document.createElement('div');
  formContainer.style.padding = '20px';

  // Titre de la modal
  const title = document.createElement('h2');
  title.textContent = getText(language, texts.soleaspayPayment);
  title.style.textAlign = 'center';
  title.style.fontSize = '20px';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '20px';

  // Création du formulaire SoleasPay
  const form = document.createElement('form');
  form.action = SOLEAS_CHECKOUT_URL;
  form.method = 'post';

  // Contenu du formulaire avec les champs à remplir par l'utilisateur
  // Si customerEmail est fourni, on cache le champ email et on le passe en hidden
  const emailField = customerEmail
    ? `
      <input name="customer[email]" type="hidden" value="${customerEmail}">
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">${getText(language, texts.yourEmail)}</label>
        <div style="width: 100%; padding: 8px; border: 1px solid #eee; border-radius: 4px; background-color: #f9f9f9; color: #666;">${customerEmail}</div>
      </div>
    `
    : `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">${getText(language, texts.yourEmail)}</label>
        <input name="customer[email]" type="email" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
      </div>
    `;

  form.innerHTML = `
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">${getText(language, texts.yourName)}</label>
      <input name="customer[name]" type="text" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
    </div>

    ${emailField}

    <input name="amount" type="number" value="${amount}" hidden>
    <input name="currency" type="text" value="XAF" hidden>
    <input name="description" type="text" value="${getText(language, texts.cardPurchase)} ${cardDetails.name}" hidden>
    <input name="orderId" type="text" value="${orderId}" hidden>
    <input name="shopName" type="hidden" value="${shopName}">
    <input name="apiKey" type="hidden" value="${SOLEAS_API_KEY}">
    <input name="successUrl" type="url" value="${successUrl}" hidden>
    <input name="failureUrl" type="url" value="${failureUrl}" hidden>
    <input name="line" type="text" value="up" hidden>

    <button type="submit" style="background-color: #4CAF50; color: white; padding: 10px 15px; border: none;
            border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%;">
      ${getText(language, texts.proceedToPayment)}
    </button>
  `;

  // Ajouter le contenu à la modal
  formContainer.appendChild(title);
  formContainer.appendChild(form);
  modalContent.appendChild(closeButton);
  modalContent.appendChild(formContainer);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  console.log('Payment modal opened with direct form');
}
