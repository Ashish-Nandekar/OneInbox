import { Router } from 'express';
import { conversationsController } from '../controllers/conversations.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', conversationsController.getConversations.bind(conversationsController));
router.get('/:id', conversationsController.getConversation.bind(conversationsController));
router.get('/:id/messages', conversationsController.getMessages.bind(conversationsController));
router.post('/:id/messages', conversationsController.sendMessage.bind(conversationsController));
router.patch('/:id/read', conversationsController.markAsRead.bind(conversationsController));
router.delete('/:id', conversationsController.deleteConversation.bind(conversationsController));

export default router;
