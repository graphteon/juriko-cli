import { ToolResult } from "../types";
import { ConfirmationService } from "../utils/confirmation-service";

export class CondenseTool {
  private confirmationService: ConfirmationService;

  constructor() {
    this.confirmationService = ConfirmationService.getInstance();
  }

  async condenseConversation(context?: string): Promise<ToolResult> {
    try {
      // Request user confirmation before condensing
      const confirmed = await this.confirmationService.requestConfirmation({
        operation: "condense",
        filename: "conversation",
        content: context || "The conversation will be summarized to reduce token usage. Recent messages will be preserved.",
        showVSCodeOpen: false,
      });

      if (!confirmed) {
        return {
          success: false,
          error: "Condense operation cancelled by user",
        };
      }

      // Return success - the actual condensing will be handled by the agent
      return {
        success: true,
        output: "User confirmed conversation condensing. The conversation will be summarized to reduce token usage while preserving important context.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Condense tool error: ${error.message}`,
      };
    }
  }
}