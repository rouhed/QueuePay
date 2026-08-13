const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter using environment variables or a fallback Ethereal test account
async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  if (pass) {
    // Strip spaces if present in Gmail App Password
    pass = pass.replace(/\s+/g, '');
  }

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port == 465, // true for 465, false for other ports
      auth: { user, pass }
    });
  } else {
    // Fallback/test account (Ethereal Email)
    console.log('ℹ️ Using Ethereal fallback email configuration...');
    if (!global.etherealAccount) {
      try {
        global.etherealAccount = await nodemailer.createTestAccount();
      } catch (err) {
        console.error('Failed to create Ethereal test account:', err);
        return null;
      }
    }
    
    if (global.etherealAccount) {
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: global.etherealAccount.user,
          pass: global.etherealAccount.pass
        }
      });
    }
  }
  return null;
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

    console.log(`✉️ Email sent successfully to ${recipient}. Message ID: ${info.messageId}`);
    
    // If Ethereal was used, log the test inbox preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Preview Sent Email: ${previewUrl}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

// ----------------------------------------------------
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

function sendForgotPasswordEmail(to, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Réinitialisation de votre mot de passe</h2>
      <p>Bonjour,</p>
      <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte client QueuePay.</p>
      <p>Voici votre code de validation à usage unique (OTP) :</p>
      <div style="background-color: #FAF6F0; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #EAD8C3;">
        <span style="font-size: 28px; font-weight: 800; color: #F97316; letter-spacing: 5px;">${otp}</span>
      </div>
      <p style="color: #EF4444; font-size: 13px;"><strong>Important :</strong> Ce code est valide pendant 5 minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      <p style="margin-top: 20px;">L'équipe QueuePay.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
      <p style="font-size: 11px; color: #78716C; text-align: center;">QueuePay Security Team.</p>
    </div>
  `;
  return sendEmail({ 
    to, 
    subject: `[QueuePay] Code de réinitialisation : ${otp}`, 
    html,
    text: `Votre code de réinitialisation QueuePay est : ${otp}`
  });
}

function sendForgotPasswordAdminAlertEmail(to, clientName, clientEmail) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #EF4444; text-align: center;">Alerte Super Admin : Demande de réinitialisation de mot de passe ⚠️</h2>
      <p>Bonjour Super Administrateur,</p>
      <p>Un utilisateur a demandé la réinitialisation de son mot de passe ou a signalé une difficulté d'accès.</p>
      <div style="background-color: #FAF6F0; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #EAD8C3;">
        <p style="margin: 5px 0;"><strong>Nom du client :</strong> ${clientName}</p>
        <p style="margin: 5px 0;"><strong>Email du client :</strong> ${clientEmail}</p>
      </div>
      <p>Cette alerte est envoyée pour des raisons de conformité et de suivi de la sécurité.</p>
      <p style="margin-top: 20px;">Système de notifications QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `[Alerte Sécurité] Mot de passe oublié pour ${clientEmail}`, html });
}

function sendCompanyResetPasswordEmail(to, entityName, tempPassword, slug, logoUrl = null) {
  const loginUrl = `http://localhost:5173/entrp/${slug}`; // Direct URL to company's login page
  
  // Base64 images fail in most email clients, so use CSS initials for local base64 logos
  const isBase64 = logoUrl && logoUrl.startsWith('data:image');
  const logoHtml = (logoUrl && !isBase64)
    ? `<img src="${logoUrl}" height="60" style="margin-bottom: 10px; border-radius: 8px;" alt="Logo" />`
    : `<div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 28px; background: linear-gradient(135deg, #0D9488, #0F766E); color: #FFFFFF; font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 10px; box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);">${entityName.charAt(0).toUpperCase()}</div>`;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #EAD8C3; border-radius: 16px; background-color: #FFFDFB; color: #292524;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #FAF6F0; padding-bottom: 16px;">
        <div style="display: inline-block; vertical-align: middle; margin-right: 15px;">
          ${logoHtml}
        </div>
        <div style="display: inline-block; vertical-align: middle; font-size: 20px; font-weight: 900; color: #F97316;">
          Queue<span style="color:#292524">Pay</span>
        </div>
      </div>
      
      <h2 style="color: #06B6D4; text-align: center; font-size: 22px; margin-top: 0;">Réinitialisation de votre accès Espace Pro</h2>
      <p>Bonjour l'administrateur de <strong>${entityName}</strong>,</p>
      <p>À votre demande, le Super Administrateur a réinitialisé le mot de passe de votre compte.</p>
      
      <p>Vos informations d'identification ont été conservées. Vous pouvez maintenant vous connecter en utilisant les identifiants temporaires suivants :</p>
      
      <div style="background-color: #FAF6F0; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #EAD8C3; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #78716C;">MOT DE PASSE TEMPORAIRE :</p>
        <span style="font-family: monospace; font-size: 24px; font-weight: 800; color: #292524; letter-spacing: 2px; background: #FFF; padding: 8px 16px; border-radius: 6px; border: 1px solid #EAD8C3;">${tempPassword}</span>
      </div>
      
      <div style="text-align: center; margin: 30px 0 15px 0;">
        <a href="${loginUrl}" style="background-color: #F97316; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);">Se connecter maintenant</a>
      </div>
      
      <p style="color: #C2410C; font-size: 12px; text-align: center; font-weight: 600;">⚠️ Pour des raisons de sécurité, nous vous recommandons de modifier ce mot de passe temporaire dès votre première connexion.</p>
      
      <p style="margin-top: 30px; border-top: 1px solid #FAF6F0; padding-top: 15px; font-size: 13px; color: #78716C;">Cordialement,<br/>L'équipe de sécurité QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Nouveau mot de passe pour votre Espace Pro ${entityName}`, html });
}

function sendAbsentEmail(to, clientName, ticketNum, entityName, serviceName) {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #FEE2E2; border-radius: 16px; background-color: #FFFDFB; color: #292524;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 40px; margin-bottom: 10px;">⏰</div>
        <h2 style="color: #EF4444; font-size: 22px; margin: 0;">Appel manqué - Ticket N°${ticketNum}</h2>
      </div>
      
      <p>Bonjour <strong>${clientName}</strong>,</p>
      <p>Votre numéro <strong>${ticketNum}</strong> a été appelé au guichet pour le service <strong>${serviceName}</strong> chez <strong>${entityName}</strong>, mais vous n'étiez pas présent.</p>
      
      <div style="background-color: #FEF2F2; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #FCA5A5;">
        <p style="margin: 0; font-size: 13px; color: #991B1B; font-weight: bold; line-height: 1.6;">
          💡 Ne vous inquiétez pas ! Votre ticket n'est pas perdu. Vous pouvez vous présenter à l'accueil physique de l'établissement aujourd'hui. L'agent pourra réactiver votre ticket pour vous faire passer rapidement.
        </p>
      </div>
      
      <p style="font-size: 12px; color: #78716C; border-top: 1px solid #FAF6F0; padding-top: 15px;">Cet e-mail automatique est envoyé pour le suivi de votre file d'attente QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `⚠️ Appel manqué - QueuePay Ticket N°${ticketNum}`, html });
}

function sendApproachingEmail(to, clientName, ticketNum, entityName, serviceName, peopleAhead) {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #EAD8C3; border-radius: 16px; background-color: #FFFDFB; color: #292524;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 40px; margin-bottom: 10px;">🚀</div>
        <h2 style="color: #F97316; font-size: 22px; margin: 0;">C'est presque votre tour !</h2>
      </div>
      
      <p>Bonjour <strong>${clientName}</strong>,</p>
      <p>Préparez-vous ! Il reste actuellement <strong>${peopleAhead} personnes</strong> avant votre numéro <strong>${ticketNum}</strong> chez <strong>${entityName}</strong> (Service: ${serviceName}).</p>
      
      <div style="background-color: #FAF6F0; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #EAD8C3; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #C2410C; font-weight: bold;">
          Veuillez vous approcher du guichet d'accueil.
        </p>
      </div>
      
      <p style="font-size: 12px; color: #78716C; border-top: 1px solid #FAF6F0; padding-top: 15px;">Suivez l'avancement en temps réel sur votre application mobile QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `🔔 C'est presque votre tour - Ticket N°${ticketNum}`, html });
}

function sendDepositReceiptEmail(to, clientName, amount, method, reference, newBalance) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #10B981; text-align: center;">Reçu de Dépôt Réussi 💰</h2>
      <p>Bonjour <strong>${clientName}</strong>,</p>
      <p>Nous vous confirmons que votre portefeuille QueuePay a été rechargé avec succès.</p>
      
      <div style="background-color: #FAF6F0; padding: 20px; border-radius: 10px; border: 1px solid #EAD8C3; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Montant Crédité :</td>
            <td style="font-weight: bold; text-align: right; color: #10B981;">+${amount} Ar</td>
          </tr>
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Moyen de Paiement :</td>
            <td style="font-weight: bold; text-align: right;">${method}</td>
          </tr>
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Référence Transaction :</td>
            <td style="font-family: monospace; text-align: right;">${reference}</td>
          </tr>
          <tr style="border-top: 1px solid #EAD8C3;">
            <td style="color: #78716C; padding: 12px 0 0 0; font-weight: bold;">Nouveau Solde :</td>
            <td style="font-weight: bold; text-align: right; color: #292524; padding-top: 12px; font-size: 18px;">${newBalance} Ar</td>
          </tr>
        </table>
      </div>
      
      <p>Vous pouvez dès maintenant réserver un service avec votre solde disponible.</p>
      <p>L'équipe QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: 'Reçu de dépôt validé - QueuePay', html });
}

function sendTicketReceiptEmail(to, clientName, ticketNum, entityName, serviceName, date, slot, price, qrToken) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Votre Ticket Réservé ! 🎫</h2>
      <p>Bonjour <strong>${clientName}</strong>,</p>
      <p>Merci pour votre réservation sur QueuePay. Votre ticket a été généré avec succès.</p>
      
      <div style="background-color: #FAF6F0; border: 2px dashed #EAD8C3; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <span style="font-size: 11px; color: #78716C; font-weight: bold; letter-spacing: 1px;">NUMÉRO DE PASSAGE</span><br/>
        <span style="font-size: 48px; font-weight: 900; color: #F97316; display: block; margin: 10px 0;">${ticketNum}</span>
        
        <table style="width: 100%; border-collapse: collapse; text-align: left; margin: 15px 0;">
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Établissement :</td>
            <td style="font-weight: bold; text-align: right;">${entityName}</td>
          </tr>
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Service :</td>
            <td style="font-weight: bold; text-align: right;">${serviceName}</td>
          </tr>
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Date :</td>
            <td style="font-weight: bold; text-align: right;">${date}</td>
          </tr>
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Créneau Horaire :</td>
            <td style="font-weight: bold; text-align: right; color: #C2410C;">${slot}</td>
          </tr>
          <tr>
            <td style="color: #78716C; padding: 6px 0;">Prix du ticket :</td>
            <td style="font-weight: bold; text-align: right;">${price} Ar</td>
          </tr>
        </table>
        
        <hr style="border: none; border-top: 1px dashed #EAD8C3; margin: 15px 0;" />
        <p style="font-size: 12px; color: #78716C; margin-bottom: 10px;">Scannez ce QR Code au guichet :</p>
        <div style="margin: 15px 0;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrToken)}" alt="QR Code Ticket" style="width: 160px; height: 160px; border-radius: 12px; border: 4px solid #FFFDFB; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" />
        </div>
        <div style="background-color: #292524; color: #FFFDFB; font-family: monospace; padding: 10px; border-radius: 6px; display: inline-block; font-size: 14px; font-weight: bold;">
          ${qrToken}
        </div>
      </div>
      
      <p>Vous recevrez une alerte en temps réel sur l'application lorsqu'il ne restera plus que 3 personnes avant votre tour.</p>
      <p>Merci pour votre confiance,<br/>L'équipe QueuePay.</p>
    </div>
  `;
  return sendEmail({ to, subject: `Ticket QueuePay N°${ticketNum} chez ${entityName}`, html });
}

function sendRegistrationOTPEmail(to, clientName, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <h2 style="color: #F97316; text-align: center;">Vérification de votre compte QueuePay</h2>
      <p>Bonjour <strong>${clientName}</strong>,</p>
      <p>Merci de vous être inscrit sur QueuePay ! Pour valider la création de votre compte client, veuillez saisir le code de sécurité OTP ci-dessous dans l'application :</p>
      <div style="background-color: #FAF6F0; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #EAD8C3;">
        <span style="font-size: 28px; font-weight: 800; color: #F97316; letter-spacing: 5px;">${otp}</span>
      </div>
      <p style="color: #78716C; font-size: 13px;">Ce code est valide pendant 5 minutes. Si vous n'avez pas initié cette inscription, vous pouvez simplement ignorer cet email.</p>
      <p style="margin-top: 20px;">L'équipe QueuePay.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
      <p style="font-size: 11px; color: #78716C; text-align: center;">QueuePay Madagascar.</p>
    </div>
  `;
  return sendEmail({ 
    to, 
    subject: `[QueuePay] Code de sécurité OTP : ${otp}`, 
    html,
    text: `Bonjour ${clientName}, votre code de validation QueuePay est : ${otp}`
  });
}

function sendTicketCalledEmail(to, clientName, ticketNum, entityName, serviceName, deskName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <div style="background-color: #10B981; padding: 14px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #FFFFFF; margin: 0; font-size: 22px;">🟢 C'EST VOTRE TOUR AU GUICHET !</h2>
      </div>
      <p>Bonjour <strong>${clientName || 'Client'}</strong>,</p>
      <p>Votre tour d'attente est arrivé chez <strong>${entityName}</strong> pour le service <strong>${serviceName}</strong> !</p>
      
      <div style="background-color: #ECFDF5; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; border: 2px solid #10B981;">
        <span style="font-size: 13px; font-weight: bold; color: #065F46; display: block; margin-bottom: 6px; letter-spacing: 1px;">VOTRE TICKET APPELÉ</span>
        <span style="font-size: 42px; font-weight: 900; color: #047857; letter-spacing: 2px;">N° ${ticketNum}</span>
        <div style="margin-top: 14px; font-size: 16px; font-weight: bold; color: #065F46; background: #D1FAE5; padding: 10px; border-radius: 8px; display: inline-block;">
          📍 Rendez-vous immédiatement au : <span style="color: #047857; font-size: 18px; text-decoration: underline;">${deskName || 'Guichet Assigné'}</span>
        </div>
      </div>

      <p style="color: #374151; font-size: 14px; text-align: center;">Veuillez vous présenter au guichet muni(e) de votre Pass Ticket ou QR Code.</p>
      <p style="margin-top: 24px; color: #6B7280; font-size: 13px;">Merci pour votre confiance,<br/>L'équipe QueuePay Madagascar.</p>
    </div>
  `;
  return sendEmail({
    to,
    subject: `🟢 C'EST VOTRE TOUR ! Ticket N°${ticketNum} chez ${entityName}`,
    html,
    text: `Bonjour ${clientName}, c'est votre tour chez ${entityName} (${serviceName}) ! Rendez-vous au ${deskName || 'Guichet'} avec votre Ticket N°${ticketNum}.`
  });
}

function sendTicketCompletedEmail(to, clientName, ticketNum, entityName, serviceName) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #FFFDFB;">
      <div style="background-color: #F97316; padding: 16px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #FFFFFF; margin: 0; font-size: 22px;">🎉 MERCI POUR VOTRE VISITE !</h2>
        <p style="color: #FFFDFB; margin: 4px 0 0 0; font-size: 13px; font-weight: bold;">SERVICE TERMINÉ AVEC SUCCÈS</p>
      </div>
      <p>Bonjour <strong>${clientName || 'Client'}</strong>,</p>
      <p>Votre passage au guichet pour le <strong>Ticket N°${ticketNum}</strong> chez <strong>${entityName}</strong> (${serviceName}) s'est déroulé avec succès.</p>
      
      <div style="background-color: #FFF7ED; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; border: 2px solid #FFD8A8;">
        <span style="font-size: 13px; font-weight: bold; color: #9A3412; display: block; margin-bottom: 6px; letter-spacing: 1px;">RÉCAPITULATIF PASSAGE</span>
        <span style="font-size: 36px; font-weight: 900; color: #EA580C; letter-spacing: 2px;">TICKET N° ${ticketNum}</span>
        <div style="margin-top: 10px; font-size: 14px; font-weight: bold; color: #1F2937;">
          ${entityName} • ${serviceName}
        </div>
      </div>

      <p style="color: #374151; font-size: 14px; text-align: center;">Toute l'équipe de <strong>${entityName}</strong> et <strong>QueuePay Madagascar</strong> vous remercie pour votre confiance !</p>
      <p style="margin-top: 24px; color: #6B7280; font-size: 13px; text-align: center;">À très bientôt sur QueuePay ! 🎈</p>
    </div>
  `;
  return sendEmail({
    to,
    subject: `🎉 Merci pour votre visite chez ${entityName} ! (Ticket N°${ticketNum})`,
    html,
    text: `Bonjour ${clientName}, merci pour votre visite chez ${entityName} ! Votre ticket N°${ticketNum} (${serviceName}) est bien terminé.`
  });
}

module.exports = {
  sendWelcomeEmail,
  sendWelcomeEntityEmail,
  sendEntityOnboardingInviteEmail,
  sendForgotPasswordEmail,
  sendForgotPasswordAdminAlertEmail,
  sendCompanyResetPasswordEmail,
  sendAbsentEmail,
  sendApproachingEmail,
  sendTicketCalledEmail,
  sendTicketCompletedEmail,
  sendDepositReceiptEmail,
  sendTicketReceiptEmail,
  sendRegistrationOTPEmail
};
