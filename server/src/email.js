const nodemailer = require('nodemailer');
const dns = require('dns');
require('dotenv').config();

// Force Node.js to prefer IPv4 over IPv6 (fixes ENETUNREACH / ETIMEDOUT on Render Cloud)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Dynamically resolve hostname to explicit IPv4 IP string to prevent IPv6 ENETUNREACH on Render
function resolveIPv4Host(hostname) {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        resolve(addresses[0]);
      } else {
        resolve(hostname);
      }
    });
  });
}

// Create transporter using environment variables or fallback credentials
async function getTransporter() {
  const targetHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || 'rouhedmouhamed@gmail.com';
  let pass = process.env.SMTP_PASS || 'wedpsimbcucamnww';

  if (pass) {
    // Strip spaces if present in Gmail App Password
    pass = pass.replace(/\s+/g, '');
  }

  // Resolve host to explicit IPv4 IP string
  const ipv4Host = await resolveIPv4Host(targetHost);
  console.log(`📡 Resolved SMTP IPv4 host: ${ipv4Host} (Original: ${targetHost})`);

  // Force IPv4 STARTTLS transport for Gmail on Cloud Servers (Render)
  return nodemailer.createTransport({
    host: ipv4Host,
    port: 587,
    secure: false, // STARTTLS over 587
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
      servername: targetHost
    }
  });
}

const QUEUEPAY_HEADER_LOGO = `
  <div style="text-align: center; padding: 20px 0 16px 0; border-bottom: 3px solid #F97316; margin-bottom: 24px; background: linear-gradient(135deg, #292524 0%, #1C1917 100%); border-radius: 12px 12px 0 0;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: auto;">
      <tr>
        <td style="vertical-align: middle; padding-right: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); text-align: center; line-height: 40px; color: #FFFDFB; font-weight: 900; font-size: 22px; font-family: 'Helvetica Neue', Arial, sans-serif; box-shadow: 0 4px 12px rgba(249,115,22,0.4);">
            Q
          </div>
        </td>
        <td style="vertical-align: middle; text-align: left;">
          <span style="font-size: 26px; font-weight: 900; color: #F97316; font-family: 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.5px;">Queue<span style="color: #FFFDFB;">Pay</span></span>
          <span style="display: block; font-size: 10px; color: #A8A29E; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-top: -2px;">Service Officiel</span>
        </td>
      </tr>
    </table>
  </div>
`;

/**
 * Send an email using standard SMTP.
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.warn('❌ Email Transporter not configured. Email was not sent.');
      return false;
    }

    let recipient = to;
    if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) {
      console.warn(`⚠️ Invalid target email "${to}". Using fallback address.`);
      recipient = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER || 'rouhedmouhamed@gmail.com';
    }

    const from = process.env.SMTP_FROM || '"QueuePay Services" <rouhedmouhamed@gmail.com>';
    
    // Prepend QueuePay header logo if not already present
    const finalHtml = html.includes('QUEUEPAY_HEADER') ? html : `${QUEUEPAY_HEADER_LOGO}${html}`;
    const plainText = text || html.replace(/<[^>]*>?/gm, '').trim();

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      text: plainText,
      html: finalHtml,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'Auto-Submitted': 'auto-generated'
      }
    });

    console.log(`✉️ Email sent successfully to ${recipient}. Message ID: ${info.messageId} | Response: ${info.response}`);
    return true;
  } catch (err) {
    console.error('❌ Send email error:', err);
    return false;
  }
}

// EMAIL TEMPLATES
// ----------------------------------------------------

function sendWelcomeEmail(to, clientName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Bienvenue chez QueuePay ! 🎉</h2>
      <p>Bonjour <strong>${clientName}</strong>,</p>
      <p>Nous sommes ravis de vous compter parmi les utilisateurs de <strong>QueuePay</strong>, l'application premium qui gère votre file d'attente à Madagascar.</p>
      <p>Avec votre compte client, vous pouvez désormais :</p>
      <ul>
        <li>Créditer votre compte via <strong>MVola, Orange Money</strong> ou <strong>Airtel Money</strong>.</li>
        <li>Réserver des tickets pour vos services en ligne auprès des mairies, banques et commerces partenaires.</li>
        <li>Suivre votre position en temps réel et recevoir des alertes pour ne plus perdre de temps à attendre physiquement.</li>
      </ul>
      <p style="margin-top: 20px;">L'équipe QueuePay.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
      <p style="font-size: 11px; color: #78716C; text-align: center;">Cet email est généré automatiquement par la plateforme QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: 'Bienvenue sur QueuePay !', html });
}

function sendWelcomeEntityEmail(to, entityName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #06B6D4; text-align: center;">Félicitations pour votre inscription ! 🏢</h2>
      <p>Bonjour,</p>
      <p>Votre entreprise/administration <strong>${entityName}</strong> a finalisé sa configuration sur la plateforme <strong>QueuePay</strong>.</p>
      <p>Vous êtes maintenant prêt à recevoir des clients et à gérer vos guichets en toute fluidité depuis la console guichet et votre tableau de bord administrateur.</p>
      <p>Merci de faire confiance à notre solution pour optimiser l'accueil de vos usagers.</p>
      <p style="margin-top: 20px;">Cordialement,<br/>L'équipe technique QueuePay.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
      <p style="font-size: 11px; color: #78716C; text-align: center;">QueuePay B2B Services.</p>
    </div>
  `;
  return sendEmail({ to, subject: 'Configuration de votre entité validée - QueuePay', html });
}

function sendEntityOnboardingInviteEmail(to, entityName, onboardingUrl) {
  const webBase = process.env.WEB_APP_URL || 'https://queuepay-web.onrender.com';
  const fullUrl = onboardingUrl.startsWith('http') ? onboardingUrl : `${webBase}${onboardingUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Invitation Partenaire QueuePay 🏢</h2>
      <p>Bonjour,</p>
      <p>Votre établissement / entreprise <strong>${entityName}</strong> a été configuré(e) avec succès sur la plateforme <strong>QueuePay</strong>.</p>
      <p>Pour procéder à la première configuration de votre espace (création de votre compte Administrateur, choix du mot de passe et gestion des guichets), veuillez cliquer sur le bouton ci-dessous :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${fullUrl}" style="background-color: #F97316; color: #FFFDFB; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
          Démarrer la configuration de ${entityName}
        </a>
      </div>
      
      <p style="font-size: 13px; color: #78716C;">Ou copiez ce lien dans votre navigateur : <br/><a href="${fullUrl}" style="color: #F97316;">${fullUrl}</a></p>
      <p style="margin-top: 20px;">Cordialement,<br/>L'équipe QueuePay B2B.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Invitation à configurer l'espace ${entityName} - QueuePay`, html });
}

function sendRegistrationOTPEmail(to, name, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #EA580C; text-align: center;">Code de vérification QueuePay</h2>
      <p>Bonjour <strong>${name}</strong>,</p>
      <p>Voici votre code de vérification pour valider la création de votre compte client QueuePay :</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-size: 32px; font-weight: 900; color: #EA580C; letter-spacing: 6px; background: #FFF7ED; padding: 12px 24px; border-radius: 12px; border: 2px dashed #FFD8A8;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #78716C; text-align: center;">Ce code est valide pendant 5 minutes. Ne le partagez avec personne.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Code de vérification QueuePay: ${otp}`, html });
}

function sendTicketConfirmationEmail(to, ticketData) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Confirmation de votre Ticket QueuePay 🎟️</h2>
      <p>Bonjour <strong>${ticketData.client_name || 'Client'}</strong>,</p>
      <p>Votre réservation de ticket auprès de <strong>${ticketData.entity_name}</strong> a été enregistrée avec succès.</p>
      
      <div style="background-color: #FFF7ED; border: 1.5px solid #FFD8A8; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 12px; color: #9A3412; font-weight: bold; text-transform: uppercase;">Numéro de Ticket</span>
        <h1 style="font-size: 42px; color: #EA580C; margin: 5px 0; font-weight: 900;">N° ${ticketData.ticket_number}</h1>
        <p style="margin: 5px 0; font-weight: bold; color: #1F2937;">${ticketData.service_name}</p>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Plage horaire estimée : <strong>${ticketData.time_slot}</strong></p>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Tarif réservé : <strong>${ticketData.price} Ar</strong></p>
      </div>

      <p>Veuillez vous présenter à l'établissement quelques minutes avant votre plage horaire. Suivez l'avancement de votre file en direct sur votre application mobile QueuePay.</p>
      <p style="margin-top: 20px;">L'équipe QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Ticket N°${ticketData.ticket_number} confirmé - ${ticketData.entity_name}`, html });
}

function sendTicketCalledEmail(to, ticketData) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #10B981; border-radius: 12px; background-color: #ECFDF5;">
      <h2 style="color: #059669; text-align: center;">🟢 C'EST VOTRE TOUR AU GUICHET !</h2>
      <p>Bonjour <strong>${ticketData.client_name || 'Client'}</strong>,</p>
      <p>Votre ticket <strong>N° ${ticketData.ticket_number}</strong> vient d'être appelé !</p>
      
      <div style="background-color: #FFFFFF; border: 2px solid #10B981; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 13px; color: #065F46; font-weight: bold;">VEUILLEZ VOUS PRÉSENTER IMMÉDIATEMENT AU :</span>
        <h1 style="font-size: 38px; color: #047857; margin: 10px 0; font-weight: 900;">${ticketData.desk_name || 'Guichet'}</h1>
        <p style="margin: 5px 0; font-weight: bold; color: #1F2937; font-size: 18px;">${ticketData.entity_name}</p>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Service : ${ticketData.service_name}</p>
      </div>

      <p style="color: #065F46; font-weight: bold; text-align: center;">L'agent guichetier vous attend pour traiter votre demande.</p>
    </div>
  `;
  return sendEmail({ to, subject: `🟢 C'est votre tour ! Ticket N°${ticketData.ticket_number} - ${ticketData.entity_name}`, html });
}

function sendTicketCompletedEmail(to, ticketData) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #3B82F6; border-radius: 12px; background-color: #EFF6FF;">
      <h2 style="color: #2563EB; text-align: center;">🎉 Service Terminé - Merci de votre visite !</h2>
      <p>Bonjour <strong>${ticketData.client_name || 'Client'}</strong>,</p>
      <p>Votre passage au guichet pour le ticket <strong>N° ${ticketData.ticket_number}</strong> auprès de <strong>${ticketData.entity_name}</strong> est maintenant terminé.</p>
      
      <div style="background-color: #FFFFFF; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="margin: 5px 0; font-weight: bold; color: #1E40AF;">Service : ${ticketData.service_name}</p>
        <p style="margin: 5px 0; color: #3B82F6; font-size: 13px;">Statut : Terminé avec succès</p>
      </div>

      <p>Merci d'avoir utilisé QueuePay pour éviter l'attente physique. À très bientôt !</p>
      <p style="margin-top: 20px;">L'équipe QueuePay & ${ticketData.entity_name}.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Attestation de passage - Ticket N°${ticketData.ticket_number}`, html });
}

function sendPasswordResetOTPEmail(to, name, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #EF4444; text-align: center;">Réinitialisation de mot de passe QueuePay</h2>
      <p>Bonjour <strong>${name}</strong>,</p>
      <p>Une demande de réinitialisation de mot de passe a été émise pour votre compte QueuePay.</p>
      <p>Voici votre code de sécurité :</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-size: 32px; font-weight: 900; color: #EF4444; letter-spacing: 6px; background: #FEF2F2; padding: 12px 24px; border-radius: 12px; border: 2px dashed #FCA5A5;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #78716C; text-align: center;">Ce code expire dans 10 minutes. Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet email.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Code de réinitialisation QueuePay: ${otp}`, html });
}

module.exports = {
  sendWelcomeEmail,
  sendWelcomeEntityEmail,
  sendEntityOnboardingInviteEmail,
  sendRegistrationOTPEmail,
  sendTicketConfirmationEmail,
  sendTicketCalledEmail,
  sendTicketCompletedEmail,
  sendPasswordResetOTPEmail,
  sendEmail
};
