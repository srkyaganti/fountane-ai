export interface CreateCustomerRequest {
  email: string;
  name: string;
  externalId: string;
  metadata?: Record<string, string>;
  billingAddress?: Address;
}

export interface UpdateCustomerRequest {
  customerId: string;
  name?: string;
  email?: string;
  metadata?: Record<string, string>;
  billingAddress?: Address;
}

export interface GetCustomerRequest {
  customerId: string;
}

export interface ListCustomersRequest {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ListCustomersResponse {
  customers: Customer[];
  total: number;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  startDate: string;
  items?: SubscriptionItem[];
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  items?: SubscriptionItem[];
  metadata?: Record<string, string>;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancellationReason?: string;
  cancelImmediately?: boolean;
}

export interface ReactivateSubscriptionRequest {
  subscriptionId: string;
}

export interface RecordUsageRequest {
  subscriptionId: string;
  metricCode: string;
  quantity: number;
  timestamp: string;
  properties?: Record<string, string>;
}

export interface GetUsageRequest {
  subscriptionId: string;
  metricCode?: string;
  fromDate: string;
  toDate: string;
}

export interface GetUsageResponse {
  usageRecords: UsageRecord[];
  totalQuantity: number;
}

export interface GenerateInvoiceRequest {
  subscriptionId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export interface GetInvoiceRequest {
  invoiceId: string;
}

export interface ListInvoicesRequest {
  customerId?: string;
  subscriptionId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListInvoicesResponse {
  invoices: Invoice[];
  total: number;
}

export interface AddPaymentMethodRequest {
  customerId: string;
  type: string;
  details: PaymentMethodDetails;
  setAsDefault?: boolean;
}

export interface RemovePaymentMethodRequest {
  paymentMethodId: string;
}

export interface SetDefaultPaymentMethodRequest {
  customerId: string;
  paymentMethodId: string;
}

export interface HandleWebhookRequest {
  provider: string;
  eventType: string;
  payload: Buffer;
  headers?: Record<string, string>;
}

export interface HandleWebhookResponse {
  success: boolean;
  message?: string;
}

export interface Customer {
  id: string;
  externalId: string;
  email: string;
  name: string;
  currency: string;
  billingAddress?: Address;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  status: string;
  planId: string;
  items?: SubscriptionItem[];
  startDate: string;
  endDate?: string;
  canceledAt?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionItem {
  priceId: string;
  quantity: number;
  properties?: Record<string, string>;
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  number: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  type: string;
  details: PaymentMethodDetails;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodDetails {
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  additionalInfo?: Record<string, string>;
}

export interface UsageRecord {
  id: string;
  subscriptionId: string;
  metricCode: string;
  quantity: number;
  timestamp: string;
  properties?: Record<string, string>;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Empty {
  message?: string;
}
