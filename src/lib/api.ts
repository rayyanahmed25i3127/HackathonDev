/** Integration contract only. The UI currently uses DemoProvider, never this client.
 * Person 1 owns /api/v1 CRM/auth routes. Person 3 owns provider routes.
 * See docs/INTEGRATION.md before replacing the demo adapter.
 */
import type { Lead, DemoState, Activity, Appointment, Payment, Message } from './types';
export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}
export interface LeadFilters {
  search?: string;
  stage?: string;
  ownerId?: string;
  source?: string;
  tag?: string;
  createdAfter?: string;
  cursor?: string;
  limit?: number;
}
export interface RelayApi {
  getWorkspace(): Promise<DemoState>;
  listLeads(filters: LeadFilters): Promise<PageResult<Lead>>;
  createLead(
    input: Omit<
      Lead,
      'id' | 'assignedAt' | 'deadline' | 'escalations' | 'lastAction' | 'createdAt'
    >,
  ): Promise<Lead>;
  updateLead(id: string, input: Partial<Lead>, version: string): Promise<Lead>;
  acknowledgeLead(id: string): Promise<Lead>;
  reassignLead(id: string, ownerId: string): Promise<Lead>;
  listActivity(filters: {
    leadId?: string;
    type?: string;
    actorId?: string;
    after?: string;
    cursor?: string;
  }): Promise<PageResult<Activity>>;
  createPayment(input: {
    leadId: string;
    amount: number;
    currency: string;
  }): Promise<{ payment: Payment; checkoutUrl: string }>;
  sendMessage(input: { leadId: string; text: string; idempotencyKey: string }): Promise<Message>;
  createAppointment(input: Omit<Appointment, 'id' | 'status'>): Promise<Appointment>;
  getIntegrationStatus(): Promise<
    {
      provider: string;
      status: 'not_connected' | 'connected' | 'error';
      lastSuccessAt: string | null;
      recentErrors: string[];
    }[]
  >;
}
export const integrationEndpoints = {
  workspace: '/api/v1/workspace',
  leads: '/api/v1/leads',
  contacts: '/api/v1/contacts',
  companies: '/api/v1/companies',
  opportunities: '/api/v1/opportunities',
  activity: '/api/v1/activity',
  team: '/api/v1/team',
  settings: '/api/v1/settings',
  twilio: '/api/integrations/twilio',
  stripe: '/api/integrations/stripe',
  google: '/api/integrations/google',
  telegram: '/api/integrations/telegram',
} as const;
