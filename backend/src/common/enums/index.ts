// ── Rôles utilisateur ────────────────────────────
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  AGENT = 'agent',
  CLIENT = 'client',
}

// ── Langues supportées ──────────────────────────
export enum Language {
  FR = 'fr',
  EN = 'en',
  MG = 'mg',
}

// ── Statut des files d'attente ──────────────────
export enum QueueStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

// ── Type de priorité ────────────────────────────
export enum PriorityType {
  STANDARD = 'standard',
  PRIORITY = 'priority',
}

// ── Statut des tickets ──────────────────────────
export enum TicketStatus {
  PENDING = 'pending',       // Ticket créé, en attente
  IN_QUEUE = 'in_queue',     // Client dans la file
  CALLED = 'called',         // Client appelé au guichet
  SERVING = 'serving',       // Client en cours de service
  COMPLETED = 'completed',   // Service rendu
  CANCELLED = 'cancelled',   // Annulé par le client ou l'admin
  NO_SHOW = 'no_show',       // Client absent
  EXPIRED = 'expired',       // Délai dépassé
}

// ── Type de paiement ────────────────────────────
export enum PaymentMethod {
  MVOLA = 'mvola',
  ORANGE_MONEY = 'orange_money',
  WALLET = 'wallet',
  FREE = 'free',
}

// ── Statut de transaction ───────────────────────
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
