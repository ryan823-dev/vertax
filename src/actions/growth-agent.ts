"use server";

import type { AssistantAction } from "@/lib/growth-agent/types";
import {
  askExecutiveAssistant,
  executeExecutiveAssistantAction,
  getLatestExecutiveAssistantState,
} from "@/actions/executive-assistant";

export async function getLatestGrowthAgentState() {
  return getLatestExecutiveAssistantState();
}

export async function askGrowthAgent(
  userMessage: string,
  conversationId?: string | null,
) {
  return askExecutiveAssistant(userMessage, conversationId);
}

export async function executeGrowthAgentAction(
  action: AssistantAction,
  conversationId?: string | null,
) {
  return executeExecutiveAssistantAction(action, conversationId);
}
