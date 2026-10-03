import { Body, Controller, ForbiddenException, Header, Headers, HttpCode, Post } from '@nestjs/common';
import * as twilio from 'twilio';
import { AlertsService } from './alerts.service';

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Twilio inbound SMS webhook: donors without the app reply "YES K7Q2" / "NO K7Q2".
 * Configure the Twilio number's messaging webhook to POST <PUBLIC_API_URL>/sms/inbound.
 */
@Controller('sms')
export class SmsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('inbound')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async inbound(@Body() body: Record<string, string>, @Headers('x-twilio-signature') signature?: string) {
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (token) {
      const url = `${process.env.PUBLIC_API_URL || ''}/sms/inbound`;
      if (!signature || !twilio.validateRequest(token, signature, url, body)) {
        throw new ForbiddenException('Invalid Twilio signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('SMS replies are not configured');
    }
    const reply = await this.alertsService.respondBySms(body.From, body.Body);
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`;
  }
}
