import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LagoService {
  private readonly logger = new Logger(LagoService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('LAGO_API_URL', 'https://api.getlago.com/api/v1');
    this.apiKey = this.configService.get<string>('LAGO_API_KEY', '');
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createCustomer(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/customers`,
          { customer: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.customer;
    } catch (error) {
      this.logger.error('Failed to create customer in Lago', error);
      throw error;
    }
  }

  async updateCustomer(externalId: string, data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.apiUrl}/customers/${externalId}`,
          { customer: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.customer;
    } catch (error) {
      this.logger.error('Failed to update customer in Lago', error);
      throw error;
    }
  }

  async getCustomer(externalId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/customers/${externalId}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data.customer;
    } catch (error) {
      this.logger.error('Failed to get customer from Lago', error);
      throw error;
    }
  }

  async createSubscription(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/subscriptions`,
          { subscription: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.subscription;
    } catch (error) {
      this.logger.error('Failed to create subscription in Lago', error);
      throw error;
    }
  }

  async cancelSubscription(externalCustomerId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.apiUrl}/subscriptions/${externalCustomerId}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to cancel subscription in Lago', error);
      throw error;
    }
  }

  async createEvent(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/events`,
          { event: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create event in Lago', error);
      throw error;
    }
  }

  async refreshInvoice(externalCustomerId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.apiUrl}/invoices/refresh`,
          {
            external_customer_id: externalCustomerId,
          },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.invoice;
    } catch (error) {
      this.logger.error('Failed to refresh invoice in Lago', error);
      throw error;
    }
  }

  async getInvoice(invoiceId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/invoices/${invoiceId}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data.invoice;
    } catch (error) {
      this.logger.error('Failed to get invoice from Lago', error);
      throw error;
    }
  }

  async listInvoices(filters: any = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/invoices`, {
          headers: this.getHeaders(),
          params: filters,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to list invoices from Lago', error);
      throw error;
    }
  }

  async createPlan(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/plans`,
          { plan: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.plan;
    } catch (error) {
      this.logger.error('Failed to create plan in Lago', error);
      throw error;
    }
  }

  async updatePlan(planCode: string, data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.apiUrl}/plans/${planCode}`,
          { plan: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.plan;
    } catch (error) {
      this.logger.error('Failed to update plan in Lago', error);
      throw error;
    }
  }

  async getPlan(planCode: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/plans/${planCode}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data.plan;
    } catch (error) {
      this.logger.error('Failed to get plan from Lago', error);
      throw error;
    }
  }

  async listPlans(filters: any = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/plans`, {
          headers: this.getHeaders(),
          params: filters,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to list plans from Lago', error);
      throw error;
    }
  }

  async createBillableMetric(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/billable_metrics`,
          { billable_metric: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.billable_metric;
    } catch (error) {
      this.logger.error('Failed to create billable metric in Lago', error);
      throw error;
    }
  }

  async updateBillableMetric(metricCode: string, data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.apiUrl}/billable_metrics/${metricCode}`,
          { billable_metric: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.billable_metric;
    } catch (error) {
      this.logger.error('Failed to update billable metric in Lago', error);
      throw error;
    }
  }

  async getBillableMetric(metricCode: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/billable_metrics/${metricCode}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data.billable_metric;
    } catch (error) {
      this.logger.error('Failed to get billable metric from Lago', error);
      throw error;
    }
  }

  async listBillableMetrics(filters: any = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/billable_metrics`, {
          headers: this.getHeaders(),
          params: filters,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to list billable metrics from Lago', error);
      throw error;
    }
  }

  async createCoupon(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/coupons`,
          { coupon: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.coupon;
    } catch (error) {
      this.logger.error('Failed to create coupon in Lago', error);
      throw error;
    }
  }

  async applyCoupon(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/applied_coupons`,
          { applied_coupon: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.applied_coupon;
    } catch (error) {
      this.logger.error('Failed to apply coupon in Lago', error);
      throw error;
    }
  }

  async createCreditNote(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/credit_notes`,
          { credit_note: data },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data.credit_note;
    } catch (error) {
      this.logger.error('Failed to create credit note in Lago', error);
      throw error;
    }
  }

  async getCreditNote(creditNoteId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/credit_notes/${creditNoteId}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data.credit_note;
    } catch (error) {
      this.logger.error('Failed to get credit note from Lago', error);
      throw error;
    }
  }

  async listCreditNotes(filters: any = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/credit_notes`, {
          headers: this.getHeaders(),
          params: filters,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to list credit notes from Lago', error);
      throw error;
    }
  }

  async getCustomerUsage(externalCustomerId: string, filters: any = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/customers/${externalCustomerId}/current_usage`, {
          headers: this.getHeaders(),
          params: filters,
        }),
      );
      return response.data.customer_usage;
    } catch (error) {
      this.logger.error('Failed to get customer usage from Lago', error);
      throw error;
    }
  }

  async validateWebhookSignature(payload: string, signature: string): boolean {
    // Implement webhook signature validation
    // This is a placeholder - actual implementation depends on Lago's webhook security
    return true;
  }
}
