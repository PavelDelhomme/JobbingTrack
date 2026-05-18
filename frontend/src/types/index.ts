// Types pour la nouvelle structure de base de données

export type ApplicationStatus =
  | "CANDIDATE_PENDING"
  | "NO_RESPONSE"
  | "NO_RESPONSE_AFTER_FIRST_FOLLOWUP"
  | "NO_RESPONSE_AFTER_SECOND_FOLLOWUP"
  | "FIRST_INTERVIEW_PENDING"
  | "OTHER_INTERVIEW_PENDING"
  | "ACCEPTED_AFTER_INTERVIEW"
  | "REJECTED_WITHOUT_INTERVIEW"
  | "REJECTED_AFTER_INTERVIEW";

export type EventType =
  | "CANDIDATURE"
  | "ENTRETIEN"
  | "RELANCE"
  | "APPEL"
  | "REUNION"
  | "DEADLINE"
  | "AUTRE";

export type NotificationType = "EMAIL" | "PUSH" | "SMS" | "IN_APP";

export type EntityType =
  | "CANDIDATURE"
  | "ENTRETIEN"
  | "RELANCE"
  | "APPEL"
  | "CONTACT"
  | "ENTREPRISE"
  | "DOCUMENT"
  | "EVENEMENT";

// Interfaces pour les nouveaux modèles

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  previousStatus?: ApplicationStatus;
  newStatus: ApplicationStatus;
  comment?: string;
  changedAt: string;
  changedBy?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string;
  entityType?: EntityType;
  entityId?: string;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isAllDay: boolean;
  type: EventType;
  isReminderActive: boolean;
  reminderMinutesBefore?: number;
  color?: string;
  applicationId?: string;
  interviewId?: string;
  followUpId?: string;
  callId?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  application?: Application;
  interview?: Interview;
  followUp?: FollowUp;
  call?: Call;
  contactEvents?: ContactEvent[];
}

export interface SyncQueue {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  payload: any;
  isSynced: boolean;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Tables de jonction many-to-many

export interface ContactCompany {
  id: string;
  contactId: string;
  companyId: string;
  createdAt: string;
}

export interface ContactApplication {
  id: string;
  contactId: string;
  applicationId: string;
  createdAt: string;
}

export interface FollowUpContact {
  id: string;
  followUpId: string;
  contactId: string;
  createdAt: string;
}

export interface InterviewContact {
  id: string;
  interviewId: string;
  contactId: string;
  createdAt: string;
}

export interface ContactEvent {
  id: string;
  contactId: string;
  eventId: string;
  createdAt: string;
}

// Extensions des interfaces existantes

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePicture?: string;
  role: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Nouvelles relations
  followUps?: FollowUp[];
  calls?: Call[];
  interviews?: Interview[];
  events?: Event[];
  notifications?: Notification[];
  statusHistory?: ApplicationStatusHistory[];
  syncQueues?: SyncQueue[];
}

export interface Application {
  id: string;
  userId: string;
  companyId: string;
  platformId?: string;
  position: string;
  description?: string;
  location?: string;
  type: string;
  salary?: string;
  status: ApplicationStatus;
  applicationDate: string;
  jobUrl?: string;
  notes?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Nouvelles relations
  events?: Event[];
  statusHistory?: ApplicationStatusHistory[];
  contactApplications?: ContactApplication[];
  event?: Event;
}

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Nouvelles relations
  followUps?: FollowUp[];
  calls?: Call[];
  interviews?: Interview[];
  contactCompanies?: ContactCompany[];
}

export interface Contact {
  id: string;
  userId: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  position?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  notes?: string;
  lastContactDate?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Nouvelles relations
  interviews?: Interview[];
  events?: Event[];
  notifications?: Notification[];
  contactCompanies?: ContactCompany[];
  contactApplications?: ContactApplication[];
  followUpContacts?: FollowUpContact[];
  interviewContacts?: InterviewContact[];
  contactEvents?: ContactEvent[];
}

export interface FollowUp {
  id: string;
  userId: string;
  applicationId: string;
  companyId: string;
  contactId?: string;
  type: string;
  scheduledDate: string;
  completed: boolean;
  completedDate?: string;
  sentDate?: string;
  subject: string;
  message?: string;
  response?: string;
  responseDate?: string;
  status: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Nouvelles relations
  events?: Event[];
  calls?: Call[];
  followUpContacts?: FollowUpContact[];
  event?: Event;
}

export interface Call {
  id: string;
  userId: string;
  applicationId: string;
  companyId?: string;
  contactId?: string;
  followUpId?: string;
  type: string;
  scheduledDate?: string;
  callDate?: string;
  duration?: number;
  status: string;
  notes?: string;
  outcome?: string;
  followUpNeeded: boolean;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Nouvelles relations
  events?: Event[];
  event?: Event;
}

export interface Interview {
  id: string;
  userId: string;
  applicationId: string;
  companyId: string;
  type: string;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingUrl?: string;
  interviewer?: string;
  notes?: string;
  status: string;
  feedback?: string;
  completedAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Nouvelles relations
  events?: Event[];
  interviewContacts?: InterviewContact[];
  contacts?: Contact[];
  event?: Event;
}

// API Response types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ContactLinkResponse {
  success: boolean;
  message: string;
  data: ContactCompany | ContactApplication;
}

export interface StatusUpdateResponse {
  success: boolean;
  message: string;
  application: Application;
  statusHistory: ApplicationStatusHistory;
}
