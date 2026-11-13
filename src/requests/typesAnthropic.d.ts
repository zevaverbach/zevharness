// Anthropic Messages API: POST /v1/messages
type requestMessagesType = {
  model: string;
  max_tokens: number; // Required
  messages: AnthropicMessage[]; // Alternating user/assistant turns
  system?: string | AnthropicTextBlock[];

  temperature?: number; // Range: [0, 1]
  top_p?: number; // Range: (0, 1]
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;

  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;

  thinking?:
    | { type: "enabled"; budget_tokens: number } // budget_tokens >= 1024, < max_tokens
    | { type: "disabled" };

  metadata?: { user_id?: string };
  service_tier?: "auto" | "standard_only";
};

// Subtypes:

type AnthropicCacheControl = { type: "ephemeral"; ttl?: "5m" | "1h" };

type AnthropicTextBlock = {
  type: "text";
  text: string;
  cache_control?: AnthropicCacheControl;
};

type AnthropicImageBlock = {
  type: "image";
  source:
    | { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string }
    | { type: "url"; url: string };
  cache_control?: AnthropicCacheControl;
};

type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: object;
};

type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content?: string | (AnthropicTextBlock | AnthropicImageBlock)[];
  is_error?: boolean;
};

type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};

type AnthropicTool = {
  name: string;
  description?: string;
  input_schema: object; // JSON Schema object
  cache_control?: AnthropicCacheControl;
};

type AnthropicToolChoice =
  | { type: "auto"; disable_parallel_tool_use?: boolean }
  | { type: "any"; disable_parallel_tool_use?: boolean }
  | { type: "tool"; name: string; disable_parallel_tool_use?: boolean }
  | { type: "none" };
