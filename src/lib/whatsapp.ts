/**
 * Utility helper for launching WhatsApp Support chats with pre-filled messages.
 */

export interface WhatsAppSupportOptions {
  whatsappNumber?: string;
  name?: string;
  phone?: string;
  orderNumber?: string;
  message?: string;
}

export function openWhatsAppSupport(options: WhatsAppSupportOptions = {}): void {
  const rawNumber = options.whatsappNumber || '919876543210';
  const cleanPhone = rawNumber.replace(/[^0-9]/g, '');

  let text = options.message;
  if (!text) {
    text = `Hello Trippy's Mehfill,\n\nI need help regarding my order.\n\nName: ${options.name || 'Customer'}\nPhone: ${options.phone || 'N/A'}\nOrder Number: ${options.orderNumber || 'N/A'}\n\nPlease assist me.`;
  }

  const encodedText = encodeURIComponent(text);
  const mobileUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  const webUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  );

  const targetUrl = isMobile ? mobileUrl : webUrl;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
