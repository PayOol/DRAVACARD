const phoneNumber = "+237692426620";
const whatsappNumber = phoneNumber.slice(1);

export const DRAVA_CONTACT = Object.freeze({
  phoneNumber,
  whatsappNumber,
  displayPhone: `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4, 7)} ${phoneNumber.slice(7, 10)} ${phoneNumber.slice(10)}`,
  phoneHref: `tel:${phoneNumber}`,
  whatsappHref: `https://wa.me/${whatsappNumber}`,
});
