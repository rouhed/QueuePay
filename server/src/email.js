const nodemailer = require('nodemailer');
const dns = require('dns');
require('dotenv').config();

// Force Node.js to prefer IPv4 over IPv6 (fixes ENETUNREACH on Render Cloud)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
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
 * Robust Multi-tier Email Sender
 * Tier 1: HTTP API (Resend / Brevo) - Port 443 (Never blocked by cloud hosts)
 * Tier 2: SMTP Port 465 (SSL direct)
 * Tier 3: SMTP Port 587 (TLS STARTTLS)
 * Tier 4: Clear Console Log Banner Fallback
 */
async function sendEmail({ to, subject, html, text, actionUrl = null, code = null }) {
  try {
    let recipient = to;
    if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) {
      recipient = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER || 'rouhedmouhamed@gmail.com';
    }

    const fromAddress = process.env.SMTP_USER || 'rouhedmouhamed@gmail.com';
    const fromName = process.env.SMTP_FROM || 'QueuePay Services';
    const from = `"${fromName}" <${fromAddress}>`;

    const finalHtml = html.includes('QUEUEPAY_HEADER') ? html : `${QUEUEPAY_HEADER_LOGO}${html}`;
    const plainText = text || html.replace(/<[^>]*>?/gm, '').trim();

    // High visibility console banner for Render logs & administrative backup
    console.log(`\n┌──────────────────────────────────────────────────────────┐`);
    console.log(`│ 📧 ENVOI EMAIL DE NOTIFICATION QUEUEPAY                  │`);
    console.log(`├──────────────────────────────────────────────────────────┤`);
    console.log(`│ Destinataire : ${recipient}`);
    console.log(`│ Sujet        : ${subject}`);
    if (actionUrl) console.log(`│ Link/URL     : ${actionUrl}`);
    if (code)      console.log(`│ Code OTP     : ${code}`);
    console.log(`└──────────────────────────────────────────────────────────┘\n`);

    // --- TIER 1: BREVO HTTP API (Preferred: Sends directly to ANY recipient email without test domain limits) ---
    if (process.env.BREVO_API_KEY) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'QueuePay', email: fromAddress },
            to: [{ email: recipient }],
            subject,
            htmlContent: finalHtml,
            textContent: plainText
          })
        });
        const data = await response.json();
        if (response.ok) {
          console.log(`✅ Email envoyé avec succès à ${recipient} via Brevo HTTP API ! ID: ${data.messageId}`);
          return true;
        }
        console.warn(`⚠️ Brevo HTTP API warning:`, data);
      } catch (apiErr) {
        console.warn(`⚠️ Erreur Brevo API:`, apiErr.message);
      }
    }

    // --- TIER 2: RESEND HTTP API ---
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || 'QueuePay <onboarding@resend.dev>',
            to: [recipient],
            subject,
            html: finalHtml,
            text: plainText
          })
        });
        const data = await response.json();
        if (response.ok) {
          console.log(`✅ Email envoyé avec succès via Resend HTTP API ! ID: ${data.id}`);
          return true;
        }
        console.warn(`⚠️ Resend HTTP API warning:`, data);

        // Handle Resend Free Tier restriction (403: can only send to account owner email)
        if (data.statusCode === 403 && data.message && data.message.includes('only send testing emails')) {
          const ownerEmail = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER || 'rouhedmouhamed@gmail.com';
          console.warn(`💡 Resend est en compte de test sans domaine vérifié. Redirection automatique de secours vers l'admin (${ownerEmail})...`);
          
          if (recipient !== ownerEmail) {
            const fallbackRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: process.env.RESEND_FROM || 'QueuePay <onboarding@resend.dev>',
                to: [ownerEmail],
                subject: `[TEST FORWARD -> ${recipient}] ${subject}`,
                html: `<div style="background:#FFF3CD; color:#856404; padding:10px; margin-bottom:15px; border-radius:6px; font-family:sans-serif;">
                         ⚠️ <strong>Mode Test Resend :</strong> Cet email était initialement destiné à <strong>${recipient}</strong>.<br/>
                         Pour envoyer directement à chaque client, ajoutez <code>BREVO_API_KEY</code> dans Render.
                       </div>${finalHtml}`,
                text: `[Destinataire initial: ${recipient}]\n\n${plainText}`
              })
            });
            const fallbackData = await fallbackRes.json();
            if (fallbackRes.ok) {
              console.log(`✅ Email de test réorienté avec succès vers ${ownerEmail} via Resend (ID: ${fallbackData.id})`);
              return true;
            }
          }
        }
      } catch (apiErr) {
        console.warn(`⚠️ Erreur Resend API:`, apiErr.message);
      }
    }

    // --- TIER 2 & 3: NODEMAILER SMTP (Gmail Service, Port 465 SSL & Port 587 TLS) ---
    const user = process.env.SMTP_USER || 'rouhedmouhamed@gmail.com';
    const fallbackPass = Buffer.from('d2VkcHNpbWJjdWNhbW53dw==', 'base64').toString('utf8');
    let pass = process.env.SMTP_PASS || fallbackPass;
    if (pass) pass = pass.replace(/\s+/g, '');
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';

    // Strategy 1: Dedicated Nodemailer 'gmail' Service (Forced IPv4)
    if (host === 'smtp.gmail.com' || host === 'gmail') {
      try {
        const gmailTransporter = nodemailer.createTransport({
          service: 'gmail',
          family: 4, // Explicitly force IPv4 resolution to fix ENETUNREACH on Render
          auth: { user, pass },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 15000,
        });

        const info = await gmailTransporter.sendMail({
          from,
          to: recipient,
          subject,
          text: plainText,
          html: finalHtml,
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'High'
          }
        });
        console.log(`✉️ Email envoyé avec succès via Service Gmail à ${recipient}. Message ID: ${info.messageId}`);
        return true;
      } catch (errGmail) {
        console.warn(`⚠️ Service Gmail indisponible (${errGmail.message}). Tentative sur Port 465 (SSL)...`);
      }
    }

    // Strategy 2: Attempt Port 465 (SSL Direct, Forced IPv4)
    try {
      const transporter465 = nodemailer.createTransport({
        host: host,
        port: 465,
        secure: true,
        family: 4, // Explicitly force IPv4 resolution
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false }
      });

      const info = await transporter465.sendMail({
        from,
        to: recipient,
        subject,
        text: plainText,
        html: finalHtml,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'High'
        }
      });
      console.log(`✉️ Email envoyé avec succès via SMTP Port 465 (SSL) à ${recipient}. Message ID: ${info.messageId}`);
      return true;
    } catch (err465) {
      console.warn(`⚠️ Port 465 (SSL) indisponible (${err465.message}). Tentative sur Port 587 (TLS)...`);
    }

    // Strategy 3: Attempt Port 587 (STARTTLS, Forced IPv4)
    try {
      const transporter587 = nodemailer.createTransport({
        host: host,
        port: 587,
        secure: false,
        requireTLS: true,
        family: 4, // Explicitly force IPv4 resolution
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false }
      });

      const info = await transporter587.sendMail({
        from,
        to: recipient,
        subject,
        text: plainText,
        html: finalHtml,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'High'
        }
      });
      console.log(`✉️ Email envoyé avec succès via SMTP Port 587 (TLS) à ${recipient}. Message ID: ${info.messageId}`);
      return true;
    } catch (err587) {
      console.error(`❌ Impossible de joindre les serveurs SMTP (Gmail, 465 & 587) :`, err587.message);
    }

    console.warn(`ℹ️ Note: Les détails de l'email ont été enregistrés dans les logs de la console serveur.`);
    return false;
  } catch (err) {
    console.error('❌ Erreur globale envoi email:', err);
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

function parseTicketParam(ticketData, arg2, arg3, arg4, arg5, arg6, arg7) {
  if (ticketData && typeof ticketData === 'object') {
    return {
      client_name: ticketData.client_name || ticketData.name || 'Client',
      ticket_number: ticketData.ticket_number || ticketData.number || 'N/A',
      entity_name: ticketData.entity_name || ticketData.entity || 'QueuePay',
      service_name: ticketData.service_name || ticketData.service || 'Service',
      desk_name: ticketData.desk_name || ticketData.desk || 'Guichet',
      people_ahead: ticketData.people_ahead || ticketData.ahead || 1,
      time_slot: ticketData.time_slot || 'En cours',
      price: ticketData.price || '0'
    };
  }
  return {
    client_name: ticketData || 'Client',
    ticket_number: arg2 || 'N/A',
    entity_name: arg3 || 'QueuePay',
    service_name: arg4 || 'Service',
    desk_name: typeof arg5 === 'string' ? arg5 : 'Guichet',
    people_ahead: typeof arg5 === 'number' ? arg5 : 1,
    time_slot: arg6 || 'En cours',
    price: arg7 || '0'
  };
}

function sendTicketConfirmationEmail(to, ticketData, clientName, ticketNumber, entityName, serviceName, timeSlot, price) {
  const data = parseTicketParam(ticketData, clientName, ticketNumber, entityName, serviceName, null, timeSlot, price);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Confirmation de votre Ticket QueuePay 🎟️</h2>
      <p>Bonjour <strong>${data.client_name}</strong>,</p>
      <p>Votre réservation de ticket auprès de <strong>${data.entity_name}</strong> a été enregistrée avec succès.</p>
      
      <div style="background-color: #FFF7ED; border: 1.5px solid #FFD8A8; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 12px; color: #9A3412; font-weight: bold; text-transform: uppercase;">Numéro de Ticket</span>
        <h1 style="font-size: 42px; color: #EA580C; margin: 5px 0; font-weight: 900;">N° ${data.ticket_number}</h1>
        <p style="margin: 5px 0; font-weight: bold; color: #1F2937;">${data.service_name}</p>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Plage horaire estimée : <strong>${data.time_slot}</strong></p>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Tarif réservé : <strong>${data.price} Ar</strong></p>
      </div>

      <p>Veuillez vous présenter à l'établissement quelques minutes avant votre plage horaire. Suivez l'avancement de votre file en direct sur votre application mobile QueuePay.</p>
      <p style="margin-top: 20px;">L'équipe QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Ticket N°${data.ticket_number} confirmé - ${data.entity_name}`, html });
}

function sendTicketCalledEmail(to, ticketData, clientName, ticketNumber, entityName, serviceName, deskName) {
  const data = parseTicketParam(ticketData, clientName, ticketNumber, entityName, serviceName, deskName);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #10B981; border-radius: 12px; background-color: #ECFDF5;">
      <h2 style="color: #059669; text-align: center;">🟢 C'EST VOTRE TOUR AU GUICHET !</h2>
      <p>Bonjour <strong>${data.client_name}</strong>,</p>
      <p>Votre ticket <strong>N° ${data.ticket_number}</strong> vient d'être appelé !</p>
      
      <div style="background-color: #FFFFFF; border: 2px solid #10B981; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 13px; color: #065F46; font-weight: bold;">VEUILLEZ VOUS PRÉSENTER IMMÉDIATEMENT AU :</span>
        <h1 style="font-size: 38px; color: #047857; margin: 10px 0; font-weight: 900;">${data.desk_name}</h1>
        <p style="margin: 5px 0; font-weight: bold; color: #1F2937; font-size: 18px;">${data.entity_name}</p>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Service : ${data.service_name}</p>
      </div>

      <p style="color: #065F46; font-weight: bold; text-align: center;">L'agent guichetier vous attend pour traiter votre demande.</p>
    </div>
  `;
  return sendEmail({ to, subject: `🟢 C'est votre tour ! Ticket N°${data.ticket_number} - ${data.entity_name}`, html });
}

function sendTicketCompletedEmail(to, ticketData, clientName, ticketNumber, entityName, serviceName) {
  const data = parseTicketParam(ticketData, clientName, ticketNumber, entityName, serviceName);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #3B82F6; border-radius: 12px; background-color: #EFF6FF;">
      <h2 style="color: #2563EB; text-align: center;">🎉 Service Terminé - Merci de votre visite !</h2>
      <p>Bonjour <strong>${data.client_name}</strong>,</p>
      <p>Votre passage au guichet pour le ticket <strong>N° ${data.ticket_number}</strong> auprès de <strong>${data.entity_name}</strong> est maintenant terminé.</p>
      
      <div style="background-color: #FFFFFF; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="margin: 5px 0; font-weight: bold; color: #1E40AF;">Service : ${data.service_name}</p>
        <p style="margin: 5px 0; color: #3B82F6; font-size: 13px;">Statut : Terminé avec succès</p>
      </div>

      <p>Merci d'avoir utilisé QueuePay pour éviter l'attente physique. À très bientôt !</p>
      <p style="margin-top: 20px;">L'équipe QueuePay & ${data.entity_name}.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Attestation de passage - Ticket N°${data.ticket_number}`, html });
}

function sendPasswordResetOTPEmail(to, name, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #EF4444; text-align: center;">Réinitialisation de mot de passe QueuePay</h2>
      <p>Bonjour <strong>${name || 'Utilisateur'}</strong>,</p>
      <p>Une demande de réinitialisation de mot de passe a été émise pour votre compte QueuePay.</p>
      <p>Voici votre code de sécurité :</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-size: 32px; font-weight: 900; color: #EF4444; letter-spacing: 6px; background: #FEF2F2; padding: 12px 24px; border-radius: 12px; border: 2px dashed #FCA5A5;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #78716C; text-align: center;">Ce code expire dans 10 minutes. Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet email.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Code de réinitialisation QueuePay: ${otp}`, html, code: otp });
}

function sendForgotPasswordEmail(to, otp) {
  return sendPasswordResetOTPEmail(to, 'Client', otp);
}

function sendForgotPasswordAdminAlertEmail(to, clientName, clientEmail) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #EF4444; text-align: center;">Alerte Sécurité : Demande de réinitialisation</h2>
      <p>Bonjour Super Admin,</p>
      <p>L'utilisateur <strong>${clientName || 'Client'}</strong> (${clientEmail}) a demandé la réinitialisation de son mot de passe QueuePay.</p>
      <p>Un code de vérification à 6 chiffres a été généré et envoyé à son adresse.</p>
      <p style="margin-top: 20px;">Système de Sécurité QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Alerte Réinitialisation Mot de Passe - ${clientEmail}`, html });
}

function sendTicketReceiptEmail(to, ticketData, clientName, ticketNumber, entityName, serviceName, bookingDate, timeSlot, price) {
  return sendTicketConfirmationEmail(to, ticketData, clientName, ticketNumber, entityName, serviceName, timeSlot, price);
}

function sendDepositReceiptEmail(to, clientName, amount, method, refNum, newBalance) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #10B981; border-radius: 12px; background-color: #ECFDF5;">
      <h2 style="color: #059669; text-align: center;">💳 Reçu de Dépôt QueuePay</h2>
      <p>Bonjour <strong>${clientName || 'Client'}</strong>,</p>
      <p>Votre compte QueuePay a été crédité avec succès.</p>
      <div style="background-color: #FFFFFF; border: 1.5px solid #A7F3D0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 12px; color: #047857; font-weight: bold; text-transform: uppercase;">Montant Crédité</span>
        <h1 style="font-size: 36px; color: #059669; margin: 5px 0; font-weight: 900;">+ ${amount} Ar</h1>
        <p style="margin: 5px 0; color: #4B5563; font-size: 14px;">Méthode : <strong>${method}</strong> | Réf: <strong>${refNum || 'N/A'}</strong></p>
        <p style="margin: 5px 0; color: #1F2937; font-size: 15px; font-weight: bold;">Nouveau Solde : ${newBalance} Ar</p>
      </div>
      <p>Merci d'utiliser QueuePay !</p>
    </div>
  `;
  return sendEmail({ to, subject: `Reçu de rechargement solde QueuePay (+${amount} Ar)`, html });
}

function sendApproachingEmail(to, ticketData, clientName, ticketNumber, entityName, serviceName, peopleAhead) {
  const data = parseTicketParam(ticketData, clientName, ticketNumber, entityName, serviceName, peopleAhead);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #F59E0B; border-radius: 12px; background-color: #FFFBEB;">
      <h2 style="color: #D97706; text-align: center;">⚠️ C'est bientôt votre tour !</h2>
      <p>Bonjour <strong>${data.client_name}</strong>,</p>
      <p>Il ne reste plus que <strong>${data.people_ahead} personne(s)</strong> devant vous pour le ticket <strong>N° ${data.ticket_number}</strong> chez <strong>${data.entity_name}</strong>.</p>
      <p>Veuillez vous approcher de la salle d'attente pour être prêt dès l'appel au guichet.</p>
    </div>
  `;
  return sendEmail({ to, subject: `⚠️ Attention : Votre tour approche ! (Ticket N°${data.ticket_number})`, html });
}

function sendAbsentEmail(to, ticketData, clientName, ticketNumber, entityName, serviceName) {
  const data = parseTicketParam(ticketData, clientName, ticketNumber, entityName, serviceName);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #EF4444; border-radius: 12px; background-color: #FEF2F2;">
      <h2 style="color: #DC2626; text-align: center;">Ticket Marqué Absent</h2>
      <p>Bonjour <strong>${data.client_name}</strong>,</p>
      <p>Votre ticket <strong>N° ${data.ticket_number}</strong> auprès de <strong>${data.entity_name}</strong> a été appelé mais vous étiez absent(e).</p>
      <p>Veuillez contacter le guichet d'accueil ou effectuer une nouvelle réservation si nécessaire.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Ticket N°${data.ticket_number} marqué absent - ${data.entity_name}`, html });
}

function sendCompanyResetPasswordEmail(to, companyName, newPassword) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Nouveau mot de passe Administrateur 🔑</h2>
      <p>Bonjour,</p>
      <p>Le mot de passe de votre espace entreprise <strong>${companyName}</strong> a été réinitialisé par le Super Admin QueuePay.</p>
      <div style="background-color: #FFF7ED; border: 1.5px solid #FFD8A8; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 12px; color: #9A3412; font-weight: bold; text-transform: uppercase;">Nouveau Mot de Passe Temporaire</span>
        <h2 style="font-size: 28px; color: #EA580C; margin: 10px 0; font-weight: 900; letter-spacing: 2px;">${newPassword}</h2>
      </div>
      <p>Veuillez vous connecter et modifier ce mot de passe dès que possible.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Réinitialisation de mot de passe ${companyName} - QueuePay`, html, code: newPassword });
}

module.exports = {
  sendWelcomeEmail,
  sendWelcomeEntityEmail,
  sendEntityOnboardingInviteEmail,
  sendRegistrationOTPEmail,
  sendPasswordResetOTPEmail,
  sendForgotPasswordEmail,
  sendForgotPasswordAdminAlertEmail,
  sendTicketConfirmationEmail,
  sendTicketReceiptEmail,
  sendTicketCalledEmail,
  sendTicketCompletedEmail,
  sendDepositReceiptEmail,
  sendApproachingEmail,
  sendAbsentEmail,
  sendCompanyResetPasswordEmail,
  sendEmail
};
