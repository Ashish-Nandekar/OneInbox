import { Router } from 'express';
import { integrationsController } from '../controllers/integrations.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Gmail OAuth callback - NO AUTH (Google redirects here)
router.get('/gmail/callback', integrationsController.gmailCallback.bind(integrationsController));

// All other routes require authentication
router.use(authenticateToken);

// Gmail routes (authenticated)
router.get('/gmail/auth', integrationsController.gmailAuth.bind(integrationsController));
router.post('/gmail/sync/:accountId', integrationsController.syncGmail.bind(integrationsController));

// Telegram routes
router.post('/telegram', integrationsController.telegramConnect.bind(integrationsController));

// General account routes
router.get('/accounts', integrationsController.getAccounts.bind(integrationsController));
router.delete('/accounts/:id', integrationsController.disconnectAccount.bind(integrationsController));

export default router;
