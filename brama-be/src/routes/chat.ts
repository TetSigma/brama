import { Router } from "express";
import {
  getConversationHistory,
  resetConversation,
  streamChat,
} from "../controllers/chat.controller.js";
import {
  chatRequestSchema,
  conversationParamsSchema,
  resetConversationSchema,
} from "../schemas/chat.schema.js";
import { validateRequest } from "../validators/validate-request.js";

export const chatRouter = Router();

chatRouter.post(
  "/chat",
  validateRequest("body", chatRequestSchema),
  streamChat,
);
chatRouter.post(
  "/reset",
  validateRequest("body", resetConversationSchema),
  resetConversation,
);
chatRouter.get(
  "/history/:id",
  validateRequest("params", conversationParamsSchema),
  getConversationHistory,
);
