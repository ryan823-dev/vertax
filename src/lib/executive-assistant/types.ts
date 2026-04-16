export type AssistantAction =
  | {
      type: "open_module";
      label: string;
      href: string;
      description?: string;
    }
  | {
      type: "sync_marketing";
      label: string;
      description?: string;
      focusSegment?: string;
    }
  | {
      type: "sync_radar";
      label: string;
      description?: string;
    }
  | {
      type: "create_task";
      label: string;
      title: string;
      priority?: "urgent" | "normal" | "low";
      description?: string;
    };

export type AssistantReference = {
  id: string;
  type: "evidence" | "product" | "activity" | "artifact";
  title: string;
  source?: string;
  href?: string;
};

export type ExecutiveAssistantPayload = {
  conclusion: string;
  evidence?: string[];
  suggestions?: string[];
  pendingConfirmation?: string[];
  references?: AssistantReference[];
  actions?: AssistantAction[];
};

export type ExecutiveAssistantExecutionResult = {
  success: boolean;
  message: string;
  href?: string;
  actionLabel?: string;
};
