import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
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

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @GrpcMethod('PaymentService', 'CreateCustomer')
  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    return this.paymentService.createCustomer(request);
  }

  @GrpcMethod('PaymentService', 'UpdateCustomer')
  async updateCustomer(request: UpdateCustomerRequest): Promise<Customer> {
    return this.paymentService.updateCustomer(request);
  }

  @GrpcMethod('PaymentService', 'GetCustomer')
  async getCustomer(request: GetCustomerRequest): Promise<Customer> {
    return this.paymentService.getCustomer(request);
  }

  @GrpcMethod('PaymentService', 'ListCustomers')
  async listCustomers(request: ListCustomersRequest): Promise<ListCustomersResponse> {
    return this.paymentService.listCustomers(request);
  }

  @GrpcMethod('PaymentService', 'CreateSubscription')
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    return this.paymentService.createSubscription(request);
  }

  @GrpcMethod('PaymentService', 'UpdateSubscription')
  async updateSubscription(request: UpdateSubscriptionRequest): Promise<Subscription> {
    return this.paymentService.updateSubscription(request);
  }

  @GrpcMethod('PaymentService', 'CancelSubscription')
  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    return this.paymentService.cancelSubscription(request);
  }

  @GrpcMethod('PaymentService', 'ReactivateSubscription')
  async reactivateSubscription(request: ReactivateSubscriptionRequest): Promise<Subscription> {
    return this.paymentService.reactivateSubscription(request);
  }

  @GrpcMethod('PaymentService', 'RecordUsage')
  async recordUsage(request: RecordUsageRequest): Promise<Empty> {
    return this.paymentService.recordUsage(request);
  }

  @GrpcMethod('PaymentService', 'GetUsage')
  async getUsage(request: GetUsageRequest): Promise<GetUsageResponse> {
    return this.paymentService.getUsage(request);
  }

  @GrpcMethod('PaymentService', 'GenerateInvoice')
  async generateInvoice(request: GenerateInvoiceRequest): Promise<Invoice> {
    return this.paymentService.generateInvoice(request);
  }

  @GrpcMethod('PaymentService', 'GetInvoice')
  async getInvoice(request: GetInvoiceRequest): Promise<Invoice> {
    return this.paymentService.getInvoice(request);
  }

  @GrpcMethod('PaymentService', 'ListInvoices')
  async listInvoices(request: ListInvoicesRequest): Promise<ListInvoicesResponse> {
    return this.paymentService.listInvoices(request);
  }

  @GrpcMethod('PaymentService', 'AddPaymentMethod')
  async addPaymentMethod(request: AddPaymentMethodRequest): Promise<PaymentMethod> {
    return this.paymentService.addPaymentMethod(request);
  }

  @GrpcMethod('PaymentService', 'RemovePaymentMethod')
  async removePaymentMethod(request: RemovePaymentMethodRequest): Promise<Empty> {
    return this.paymentService.removePaymentMethod(request);
  }

  @GrpcMethod('PaymentService', 'SetDefaultPaymentMethod')
  async setDefaultPaymentMethod(request: SetDefaultPaymentMethodRequest): Promise<Empty> {
    return this.paymentService.setDefaultPaymentMethod(request);
  }

  @GrpcMethod('PaymentService', 'HandleWebhook')
  async handleWebhook(request: HandleWebhookRequest): Promise<HandleWebhookResponse> {
    return this.paymentService.handleWebhook(request);
  }
}
