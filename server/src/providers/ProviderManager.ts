import { Provider } from '@prisma/client';
import { MessagingProvider } from './MessagingProvider';
import { GmailProvider } from './gmail/GmailProvider';
import { TelegramProvider } from './telegram/TelegramProvider';

export class ProviderManager {
  private providers: Map<Provider, MessagingProvider>;

  constructor() {
    this.providers = new Map();
    this.registerProviders();
  }

  private registerProviders() {
    // Register Gmail provider
    const gmailProvider = new GmailProvider();
    this.providers.set(Provider.gmail, gmailProvider);

    // Register Telegram provider
    const telegramProvider = new TelegramProvider();
    this.providers.set(Provider.telegram, telegramProvider);
  }

  getProvider(providerType: Provider): MessagingProvider {
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      throw new Error(`Provider ${providerType} not found`);
    }

    return provider;
  }

  getAllProviders(): MessagingProvider[] {
    return Array.from(this.providers.values());
  }

  isProviderSupported(providerType: Provider): boolean {
    return this.providers.has(providerType);
  }
}

// Singleton instance
export const providerManager = new ProviderManager();
