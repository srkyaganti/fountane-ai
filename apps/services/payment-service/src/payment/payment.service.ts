import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus, InvoiceStatus, PaymentMethodType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LagoService } from '../lago/lago.service';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  GetCustomerRequest,
  ListCustomersRequest,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  CancelSubscriptionRequest,
  ReactivateSubscriptionRequest,
  RecordUsageRequest,
  GetUsageRequest,
  GenerateInvoiceRequest,
  GetInvoiceRequest,
  ListInvoicesRequest,
  AddPaymentMethodRequest,
  RemovePaymentMethodRequest,
  SetDefaultPaymentMethodRequest,
  HandleWebhookRequest,
  Customer,
  ListCustomersResponse,
  Subscription,
  Empty,
  GetUsageResponse,
  Invoice,
  ListInvoicesResponse,
  PaymentMethod,
  HandleWebhookResponse,
} from './payment.interface';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lagoService: LagoService,
    private readonly configService: ConfigService,
  ) {}

  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    try {
      // Create customer in Lago
      const lagoCustomer = await this.lagoService.createCustomer({
        external_id: request.externalId,
        email: request.email,
        name: request.name,
        billing_configuration: {
          invoice_grace_period: 3,
          payment_provider: 'stripe',
        },
        metadata: request.metadata,
      });

      // Store customer in local database
      const customer = await this.prisma.customer.create({
        data: {
          externalId: request.externalId,
          email: request.email,
          name: request.name,
          currency: lagoCustomer.currency || 'USD',
          billingAddress: request.billingAddress || {},
          metadata: request.metadata || {},
        },
      });

      this.logger.log(`Customer created: ${customer.id}`);

      return this.formatCustomer(customer);
    } catch (error) {
      this.logger.error('Failed to create customer', error);
      throw error;
    }
  }

  async updateCustomer(request: UpdateCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: request.customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Update in Lago
      await this.lagoService.updateCustomer(customer.externalId, {
        email: request.email,
        name: request.name,
        metadata: request.metadata,
      });

      // Update in local database
      const updatedCustomer = await this.prisma.customer.update({
        where: { id: request.customerId },
        data: {
          email: request.email,
          name: request.name,
          billingAddress: request.billingAddress,
          metadata: request.metadata,
        },
      });

      return this.formatCustomer(updatedCustomer);
    } catch (error) {
      this.logger.error('Failed to update customer', error);
      throw error;
    }
  }

  async getCustomer(request: GetCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: request.customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      return this.formatCustomer(customer);
    } catch (error) {
      this.logger.error('Failed to get customer', error);
      throw error;
    }
  }

  async listCustomers(request: ListCustomersRequest): Promise<ListCustomersResponse> {
    try {
      const where = request.search
        ? {
            OR: [
              { email: { contains: request.search, mode: 'insensitive' as const } },
              { name: { contains: request.search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [customers, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          take: request.limit || 20,
          skip: request.offset || 0,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.customer.count({ where }),
      ]);

      return {
        customers: customers.map((customer) => this.formatCustomer(customer)),
        total,
      };
    } catch (error) {
      this.logger.error('Failed to list customers', error);
      throw error;
    }
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: request.customerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Create subscription in Lago
      const lagoSubscription = await this.lagoService.createSubscription({
        external_customer_id: customer.externalId,
        plan_code: request.planId,
        subscription_at: request.startDate,
      });

      // Store subscription in local database
      const subscription = await this.prisma.subscription.create({
        data: {
          customerId: request.customerId,
          planId: request.planId,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(request.startDate),
          metadata: request.metadata || {},
          items: {
            create:
              request.items?.map((item) => ({
                priceId: item.priceId,
                quantity: item.quantity,
                properties: item.properties || {},
              })) || [],
          },
        },
        include: { items: true },
      });

      this.logger.log(`Subscription created: ${subscription.id}`);

      return this.formatSubscription(subscription);
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw error;
    }
  }

  async updateSubscription(request: UpdateSubscriptionRequest): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: request.subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Update in Lago if needed
      // Lago API might have specific update endpoints

      // Update subscription items
      if (request.items) {
        await this.prisma.subscriptionItem.deleteMany({
          where: { subscriptionId: request.subscriptionId },
        });

        await this.prisma.subscriptionItem.createMany({
          data: request.items.map((item) => ({
            subscriptionId: request.subscriptionId,
            priceId: item.priceId,
            quantity: item.quantity,
            properties: item.properties || {},
          })),
        });
      }

      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: request.subscriptionId },
        data: {
          metadata: request.metadata,
        },
        include: { items: true },
      });

      return this.formatSubscription(updatedSubscription);
    } catch (error) {
      this.logger.error('Failed to update subscription', error);
      throw error;
    }
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: request.subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Cancel in Lago
      await this.lagoService.cancelSubscription(subscription.customer.externalId);

      // Update local database
      const canceledSubscription = await this.prisma.subscription.update({
        where: { id: request.subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          endDate: request.cancelImmediately ? new Date() : undefined,
        },
        include: { items: true },
      });

      this.logger.log(`Subscription canceled: ${canceledSubscription.id}`);

      return this.formatSubscription(canceledSubscription);
    } catch (error) {
      this.logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  async reactivateSubscription(request: ReactivateSubscriptionRequest): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: request.subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== SubscriptionStatus.CANCELED) {
        throw new Error('Subscription is not canceled');
      }

      // Reactivate in Lago (might need to create a new subscription)
      await this.lagoService.createSubscription({
        external_customer_id: subscription.customer.externalId,
        plan_code: subscription.planId,
        subscription_at: new Date().toISOString(),
      });

      // Update local database
      const reactivatedSubscription = await this.prisma.subscription.update({
        where: { id: request.subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          canceledAt: null,
          endDate: null,
        },
        include: { items: true },
      });

      this.logger.log(`Subscription reactivated: ${reactivatedSubscription.id}`);

      return this.formatSubscription(reactivatedSubscription);
    } catch (error) {
      this.logger.error('Failed to reactivate subscription', error);
      throw error;
    }
  }

  async recordUsage(request: RecordUsageRequest): Promise<Empty> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: request.subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Record usage in Lago
      await this.lagoService.createEvent({
        transaction_id: `usage_${Date.now()}`,
        external_customer_id: subscription.customer.externalId,
        code: request.metricCode,
        timestamp: Math.floor(new Date(request.timestamp).getTime() / 1000),
        properties: {
          ...request.properties,
          value: request.quantity,
        },
      });

      // Store usage record locally
      await this.prisma.usageRecord.create({
        data: {
          subscriptionId: request.subscriptionId,
          metricCode: request.metricCode,
          quantity: request.quantity,
          timestamp: new Date(request.timestamp),
          properties: request.properties || {},
        },
      });

      this.logger.log(`Usage recorded for subscription: ${request.subscriptionId}`);

      return { message: 'Usage recorded successfully' };
    } catch (error) {
      this.logger.error('Failed to record usage', error);
      throw error;
    }
  }

  async getUsage(request: GetUsageRequest): Promise<GetUsageResponse> {
    try {
      const where: any = {
        subscriptionId: request.subscriptionId,
        timestamp: {
          gte: new Date(request.fromDate),
          lte: new Date(request.toDate),
        },
      };

      if (request.metricCode) {
        where.metricCode = request.metricCode;
      }

      const usageRecords = await this.prisma.usageRecord.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      const totalQuantity = usageRecords.reduce((sum, record) => sum + record.quantity, 0);

      return {
        usageRecords: usageRecords.map((record) => this.formatUsageRecord(record)),
        totalQuantity,
      };
    } catch (error) {
      this.logger.error('Failed to get usage', error);
      throw error;
    }
  }

  async generateInvoice(request: GenerateInvoiceRequest): Promise<Invoice> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: request.subscriptionId },
        include: { customer: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Generate invoice in Lago
      const lagoInvoice = await this.lagoService.refreshInvoice(subscription.customer.externalId);

      // Calculate invoice items based on usage
      const usageRecords = await this.prisma.usageRecord.findMany({
        where: {
          subscriptionId: request.subscriptionId,
          timestamp: {
            gte: new Date(request.billingPeriodStart),
            lte: new Date(request.billingPeriodEnd),
          },
        },
      });

      // Create invoice in local database
      const invoice = await this.prisma.invoice.create({
        data: {
          customerId: subscription.customerId,
          subscriptionId: request.subscriptionId,
          number: `INV-${Date.now()}`,
          status: InvoiceStatus.DRAFT,
          amountDue: lagoInvoice.total_amount_cents / 100,
          currency: lagoInvoice.currency,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          metadata: {},
          items: {
            create: lagoInvoice.fees.map((fee: any) => ({
              description: fee.item_name,
              quantity: fee.units,
              unitPrice: fee.unit_amount_cents / 100,
              amount: fee.amount_cents / 100,
              currency: fee.amount_currency,
            })),
          },
        },
        include: { items: true },
      });

      this.logger.log(`Invoice generated: ${invoice.id}`);

      return this.formatInvoice(invoice);
    } catch (error) {
      this.logger.error('Failed to generate invoice', error);
      throw error;
    }
  }

  async getInvoice(request: GetInvoiceRequest): Promise<Invoice> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: request.invoiceId },
        include: { items: true },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return this.formatInvoice(invoice);
    } catch (error) {
      this.logger.error('Failed to get invoice', error);
      throw error;
    }
  }

  async listInvoices(request: ListInvoicesRequest): Promise<ListInvoicesResponse> {
    try {
      const where: any = {};

      if (request.customerId) {
        where.customerId = request.customerId;
      }

      if (request.subscriptionId) {
        where.subscriptionId = request.subscriptionId;
      }

      if (request.status) {
        where.status = request.status as InvoiceStatus;
      }

      const [invoices, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          take: request.limit || 20,
          skip: request.offset || 0,
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        }),
        this.prisma.invoice.count({ where }),
      ]);

      return {
        invoices: invoices.map((invoice) => this.formatInvoice(invoice)),
        total,
      };
    } catch (error) {
      this.logger.error('Failed to list invoices', error);
      throw error;
    }
  }

  async addPaymentMethod(request: AddPaymentMethodRequest): Promise<PaymentMethod> {
    try {
      // If this is set as default, unset other defaults
      if (request.setAsDefault) {
        await this.prisma.paymentMethod.updateMany({
          where: { customerId: request.customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const paymentMethod = await this.prisma.paymentMethod.create({
        data: {
          customerId: request.customerId,
          type: request.type as PaymentMethodType,
          details: request.details || {},
          isDefault: request.setAsDefault || false,
        },
      });

      // Update payment method in Lago/Stripe
      // This would involve calling the payment provider API

      this.logger.log(`Payment method added: ${paymentMethod.id}`);

      return this.formatPaymentMethod(paymentMethod);
    } catch (error) {
      this.logger.error('Failed to add payment method', error);
      throw error;
    }
  }

  async removePaymentMethod(request: RemovePaymentMethodRequest): Promise<Empty> {
    try {
      const paymentMethod = await this.prisma.paymentMethod.findUnique({
        where: { id: request.paymentMethodId },
      });

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      await this.prisma.paymentMethod.delete({
        where: { id: request.paymentMethodId },
      });

      // Remove from payment provider
      // This would involve calling the payment provider API

      this.logger.log(`Payment method removed: ${request.paymentMethodId}`);

      return { message: 'Payment method removed successfully' };
    } catch (error) {
      this.logger.error('Failed to remove payment method', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(request: SetDefaultPaymentMethodRequest): Promise<Empty> {
    try {
      // Unset all defaults for this customer
      await this.prisma.paymentMethod.updateMany({
        where: { customerId: request.customerId },
        data: { isDefault: false },
      });

      // Set the new default
      await this.prisma.paymentMethod.update({
        where: { id: request.paymentMethodId },
        data: { isDefault: true },
      });

      this.logger.log(`Default payment method set: ${request.paymentMethodId}`);

      return { message: 'Default payment method updated successfully' };
    } catch (error) {
      this.logger.error('Failed to set default payment method', error);
      throw error;
    }
  }

  async handleWebhook(request: HandleWebhookRequest): Promise<HandleWebhookResponse> {
    try {
      // Store webhook event
      const webhookEvent = await this.prisma.webhookEvent.create({
        data: {
          provider: request.provider,
          eventType: request.eventType,
          payload: JSON.parse(request.payload.toString()),
          headers: request.headers || {},
        },
      });

      // Process webhook based on provider and event type
      switch (request.provider) {
        case 'lago':
          await this.processLagoWebhook(request.eventType, JSON.parse(request.payload.toString()));
          break;
        case 'stripe':
          await this.processStripeWebhook(
            request.eventType,
            JSON.parse(request.payload.toString()),
          );
          break;
        default:
          throw new Error(`Unknown webhook provider: ${request.provider}`);
      }

      // Mark webhook as processed
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processedAt: new Date() },
      });

      this.logger.log(`Webhook processed: ${request.provider} - ${request.eventType}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to handle webhook', error);

      // Store error in webhook event
      if (error instanceof Error) {
        await this.prisma.webhookEvent.updateMany({
          where: {
            provider: request.provider,
            eventType: request.eventType,
            processedAt: null,
          },
          data: { error: error.message },
        });
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processLagoWebhook(eventType: string, payload: any): Promise<void> {
    switch (eventType) {
      case 'invoice.created':
        // Handle invoice created event
        break;
      case 'invoice.paid':
        // Update invoice status to paid
        await this.prisma.invoice.updateMany({
          where: { number: payload.invoice_number },
          data: {
            status: InvoiceStatus.PAID,
            amountPaid: payload.total_amount_cents / 100,
            paidAt: new Date(),
          },
        });
        break;
      // Handle other Lago events
    }
  }

  private async processStripeWebhook(eventType: string, payload: any): Promise<void> {
    switch (eventType) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        break;
      case 'payment_intent.failed':
        // Handle failed payment
        break;
      // Handle other Stripe events
    }
  }

  private formatCustomer(customer: any): Customer {
    return {
      id: customer.id,
      externalId: customer.externalId,
      email: customer.email,
      name: customer.name,
      currency: customer.currency,
      billingAddress: customer.billingAddress,
      metadata: customer.metadata,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  private formatSubscription(subscription: any): Subscription {
    return {
      id: subscription.id,
      customerId: subscription.customerId,
      status: subscription.status,
      planId: subscription.planId,
      items: subscription.items?.map((item: any) => ({
        priceId: item.priceId,
        quantity: item.quantity,
        properties: item.properties,
      })),
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate?.toISOString(),
      canceledAt: subscription.canceledAt?.toISOString(),
      metadata: subscription.metadata,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  private formatInvoice(invoice: any): Invoice {
    return {
      id: invoice.id,
      customerId: invoice.customerId,
      subscriptionId: invoice.subscriptionId,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amountDue,
      amountPaid: invoice.amountPaid,
      currency: invoice.currency,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      items:
        invoice.items?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          currency: item.currency,
        })) || [],
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  private formatPaymentMethod(method: any): PaymentMethod {
    return {
      id: method.id,
      customerId: method.customerId,
      type: method.type,
      details: method.details,
      isDefault: method.isDefault,
      createdAt: method.createdAt.toISOString(),
      updatedAt: method.updatedAt.toISOString(),
    };
  }

  private formatUsageRecord(record: any): UsageRecord {
    return {
      id: record.id,
      subscriptionId: record.subscriptionId,
      metricCode: record.metricCode,
      quantity: record.quantity,
      timestamp: record.timestamp.toISOString(),
      properties: record.properties,
    };
  }
}
