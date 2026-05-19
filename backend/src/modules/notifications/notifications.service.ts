import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';

export enum NotificationType {
  SMS = 'SMS',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');
  private transporter: nodemailer.Transporter;
  private africasTalking: any;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'test@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });

    if (!admin.apps.length) {
      try {
        if (process.env.FIREBASE_PROJECT_ID) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
          });
          this.logger.log('Firebase Admin initialisé.');
        } else {
          this.logger.warn('FIREBASE_PROJECT_ID non défini, push simulé.');
        }
      } catch (e: any) {
        this.logger.warn('Erreur initialisation Firebase: ' + e.message);
      }
    }

    try {
      const credentials = {
        apiKey: process.env.AT_API_KEY || 'fake_api_key',
        username: process.env.AT_USERNAME || 'sandbox',
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AfricasTalking = require('africastalking')(credentials);
      this.africasTalking = AfricasTalking.SMS;
      this.logger.log("Africa's Talking initialisé.");
    } catch (e: any) {
      this.logger.warn("Erreur initialisation Africa's Talking: " + e.message);
    }
  }

  /**
   * Envoi d'une notification push (FCM)
   */
  async sendPushNotification(fcmToken: string, title: string, body: string, data?: any): Promise<boolean> {
    try {
      this.logger.log(`[PUSH] -> ${fcmToken} | ${title}: ${body}`);
      if (admin.apps.length > 0) {
        await admin.messaging().send({
          token: fcmToken,
          notification: { title, body },
          data: data || {},
        });
      } else {
        this.logger.log(`(SIMULÉ) Push envoyé à ${fcmToken}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Erreur Push FCM: ${error}`);
      return false;
    }
  }

  /**
   * Envoi d'un SMS
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      this.logger.log(`[SMS] -> ${phoneNumber} | ${message}`);
      if (process.env.AT_API_KEY && this.africasTalking) {
        await this.africasTalking.send({
          to: [phoneNumber],
          message,
        });
      } else {
        this.logger.log(`(SIMULÉ) SMS envoyé à ${phoneNumber}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Erreur SMS: ${error}`);
      return false;
    }
  }

  /**
   * Envoi d'un Email
   */
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      this.logger.log(`[EMAIL] -> ${to} | Sujet: ${subject}`);
      if (process.env.SMTP_USER) {
        await this.transporter.sendMail({
          from: `"QueuePay" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html: htmlContent,
        });
      } else {
        this.logger.log(`(SIMULÉ) Email envoyé à ${to}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Erreur Email: ${error}`);
      return false;
    }
  }

  /**
   * Fonction utilitaire pour envoyer un reçu de dépôt Wallet
   */
  async sendDepositReceipt(user: any, amount: number, method: string) {
    if (user.phone) {
      await this.sendSms(
        user.phone, 
        `QueuePay: Votre dépôt de ${amount} Ar via ${method} a été confirmé. Solde mis à jour.`
      );
    }
    if (user.email) {
      await this.sendEmail(
        user.email,
        `Reçu de dépôt - QueuePay`,
        `<p>Bonjour ${user.firstName},</p><p>Votre dépôt de <b>${amount} Ar</b> via ${method} a été confirmé avec succès.</p>`
      );
    }
  }

  /**
   * Notification quand le client est appelé
   */
  async notifyTicketCalled(user: any, ticketNumber: string, counterNumber: number) {
    if (user.fcmToken) {
      await this.sendPushNotification(
        user.fcmToken,
        'C\'est votre tour !',
        `Votre ticket ${ticketNumber} est appelé au guichet ${counterNumber}.`
      );
    }
    if (user.phone) {
      await this.sendSms(
        user.phone,
        `QueuePay: C'est votre tour ! Votre ticket ${ticketNumber} est appelé au guichet ${counterNumber}.`
      );
    }
  }

  /**
   * Notification d'approche (ex: 3 personnes avant)
   */
  async notifyTicketApproaching(user: any, ticketNumber: string, position: number) {
    if (user.fcmToken) {
      await this.sendPushNotification(
        user.fcmToken,
        'Préparez-vous',
        `Il reste ${position - 1} personnes avant vous (Ticket ${ticketNumber}).`
      );
    }
    if (user.phone) {
      await this.sendSms(
        user.phone,
        `QueuePay: Préparez-vous, il reste ${position - 1} personnes avant votre tour (Ticket ${ticketNumber}).`
      );
    }
  }
}
