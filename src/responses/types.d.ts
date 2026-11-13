/**
 * OpenRouter Responses API RESPONSE types (the object returned by POST /api/v1/responses).
 *
 * Scope: the non-streaming response object, its output items, content parts, usage and
 * status. Streaming events (`response.*`) and request types are NOT covered here
 * (request types live in ../requests/types.d.ts).
 *
 * Source: OpenRouter's OpenAPI spec (https://openrouter.ai/openapi.json), schemas
 * `OpenResponsesResult` / `BaseResponsesResult` and the OutputItem* schemas.
 *
 * Notes:
 *  - Output items are discriminated by `type`. Unknown item types are allowed via
 *    `UnknownOutputItem` because the spec has many server-tool variants we don't model.
 *  - Enums marked "open" in the spec use `string` here so new upstream values don't break parsing.
 *
 * Marker:
 *   [?]  not confirmed in the spec (taken from docs examples).
 */

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

type ResponseStatus = "completed" | "incomplete" | "in_progress" | "failed" | "cancelled" | "queued";

type ItemStatus = "completed" | "incomplete" | "in_progress";

type ServiceTierValue = "auto" | "default" | "flex" | "priority" | "scale" | "ultrafast";

type TruncationValue = "auto" | "disabled";

/** Error on a failed response. `code` is an open enum in the spec (e.g. "server_error", "rate_limit_exceeded"). */
type ResponseError = {
  code: string;
  message: string;
};

type IncompleteDetails = {
  reason: "max_output_tokens" | "content_filter" | string;
} | null;

// ---------------------------------------------------------------------------
// Annotations (attached to output_text)
// ---------------------------------------------------------------------------

type FileCitationAnnotation = {
  type: "file_citation";
  file_id: string;
  filename: string;
  index: number;
};

type UrlCitationAnnotation = {
  type: "url_citation";
  url: string;
  title: string;
  start_index: number;
  end_index: number;
  content?: string;
};

type FilePathAnnotation = {
  type: "file_path";
  file_id: string;
  index: number;
};

type Annotation = FileCitationAnnotation | UrlCitationAnnotation | FilePathAnnotation;

// ---------------------------------------------------------------------------
// Content parts (inside message output items)
// ---------------------------------------------------------------------------

type LogprobEntry = {
  token: string;
  logprob: number;
  bytes: number[];
  top_logprobs: { token: string; logprob: number; bytes: number[] }[];
};

type OutputTextContent = {
  type: "output_text";
  text: string;
  annotations?: Annotation[];
  logprobs?: LogprobEntry[];
};

type RefusalContent = {
  type: "refusal";
  refusal: string;
};

type OutputMessageContent = OutputTextContent | RefusalContent;

// ---------------------------------------------------------------------------
// Output items: messages & reasoning
// ---------------------------------------------------------------------------

type ResponsesOutputMessageItem = {
  type: "message";
  id: string;
  role: "assistant";
  status?: ItemStatus;
  phase?: "commentary" | "final_answer" | null;
  content: OutputMessageContent[];
};

type ReasoningSummaryText = { type: "summary_text"; text: string };
type ReasoningText = { type: "reasoning_text"; text: string };

type ReasoningOutputItem = {
  type: "reasoning";
  id: string;
  status?: ItemStatus;
  summary: ReasoningSummaryText[];
  content?: ReasoningText[];
  encrypted_content?: string | null;
};

// ---------------------------------------------------------------------------
// Output items: function & custom tool calls
// ---------------------------------------------------------------------------

type ResponsesFunctionCallOutputItem = {
  type: "function_call";
  id?: string;
  call_id: string;
  name: string;
  namespace?: string;
  arguments: string; // JSON string
  status?: ItemStatus;
  async?: boolean;
};

type ResponsesCustomToolCallOutputItem = {
  type: "custom_tool_call";
  id?: string;
  call_id: string;
  name: string;
  namespace?: string;
  input: string;
  status?: "in_progress" | "completed" | "incomplete";
  async?: boolean;
};

// ---------------------------------------------------------------------------
// Output items: server-executed tools
// ---------------------------------------------------------------------------

type WebSearchCallStatus = "completed" | "searching" | "in_progress" | "failed" | "incomplete";

type WebSearchCallOutputItem = {
  type: "web_search_call";
  id: string;
  status: WebSearchCallStatus;
  action?:
    | { type: "search"; query: string; queries?: string[]; sources?: { type: "url"; url: string }[] }
    | { type: "open_page"; url?: string | null }
    | { type: "find_in_page"; url: string; pattern: string };
};

type FileSearchCallOutputItem = {
  type: "file_search_call";
  id: string;
  status: WebSearchCallStatus;
  queries: string[];
};

type ImageGenerationCallOutputItem = {
  type: "image_generation_call";
  id: string;
  status: "in_progress" | "completed" | "generating" | "failed";
  result?: string | null; // base64
};

type CodeInterpreterCallOutputItem = {
  type: "code_interpreter_call";
  id: string;
  status: "in_progress" | "completed" | "incomplete" | "interpreting" | "failed";
  code?: string | null;
  container_id?: string;
  outputs?: unknown[] | null;
};

// ---------------------------------------------------------------------------
// Output items: MCP
// ---------------------------------------------------------------------------

type McpCallOutputItem = {
  type: "mcp_call";
  id: string;
  server_label: string;
  name: string;
  arguments: string;
  output?: string | null;
  approval_request_id?: string | null;
  status?: "in_progress" | "completed" | "incomplete" | "calling" | "failed";
  error?: string | { type: string; code?: number; message?: string } | null;
};

type McpListToolsOutputItem = {
  type: "mcp_list_tools";
  id: string;
  server_label: string;
  error?: string | null;
  tools: { name: string; description?: string | null; input_schema: object; annotations?: unknown }[];
};

type McpApprovalRequestOutputItem = {
  type: "mcp_approval_request";
  id: string;
  server_label: string;
  name: string;
  arguments: string;
};

// ---------------------------------------------------------------------------
// Output items: misc
// ---------------------------------------------------------------------------

type CompactionOutputItem = {
  type: "compaction";
  id: string;
  encrypted_content: string;
  created_by?: string;
};

/** Fallback for output item types not modeled above (apply_patch, shell, computer, etc.). */
type UnknownOutputItem = { type: string; id?: string; [key: string]: unknown };

type OutputItem =
  | ResponsesOutputMessageItem
  | ReasoningOutputItem
  | ResponsesFunctionCallOutputItem
  | ResponsesCustomToolCallOutputItem
  | WebSearchCallOutputItem
  | FileSearchCallOutputItem
  | ImageGenerationCallOutputItem
  | CodeInterpreterCallOutputItem
  | McpCallOutputItem
  | McpListToolsOutputItem
  | McpApprovalRequestOutputItem
  | CompactionOutputItem
  | UnknownOutputItem;

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

type ResponseUsage = {
  input_tokens: number;
  input_tokens_details: {
    cached_tokens: number;
    cache_write_tokens?: number | null;
  };
  output_tokens: number;
  output_tokens_details: {
    reasoning_tokens: number;
  };
  total_tokens: number;
  // OpenRouter extensions
  cost?: number | null;
  cost_details?: {
    upstream_inference_cost?: number | null;
    upstream_inference_input_cost: number;
    upstream_inference_output_cost: number;
    server_tool_cost?: number | null;
  };
  is_byok?: boolean;
  server_tool_use_details?: unknown;
  deferred_tools_details?: unknown;
} | null;

// ---------------------------------------------------------------------------
// OpenRouter routing metadata (present when opted in) [?]
// ---------------------------------------------------------------------------

type OpenRouterMetadata = {
  requested: string;
  summary: string;
  attempt: number;
  attempts?: unknown[];
  endpoints: unknown;
  generation_time?: number;
  is_byok: boolean;
  params?: unknown;
  pipeline?: unknown[];
  region: string | null;
  strategy: unknown;
};

// ---------------------------------------------------------------------------
// The response
// ---------------------------------------------------------------------------

type ResponsesResponseType = {
  id: string;
  object: "response";
  created_at: number; // unix seconds
  completed_at: number | null;
  model: string;
  status: ResponseStatus;
  error: ResponseError | null;
  incomplete_details: IncompleteDetails;
  output: OutputItem[];
  output_text?: string;

  // Echoed request settings
  instructions: string | unknown[] | null;
  metadata: Record<string, string> | null;
  tools: Tool[];
  tool_choice: ToolChoice;
  parallel_tool_calls: boolean;
  temperature: number | null;
  top_p?: number | null;
  presence_penalty: number | null;
  frequency_penalty: number | null;
  max_output_tokens?: number | null;
  max_tool_calls?: number | null;
  reasoning?: ReasoningConfig;
  text?: TextConfig & { verbosity?: "low" | "medium" | "high" | "xhigh" | "max" | null };
  truncation?: TruncationValue | null;
  service_tier?: ServiceTierValue | string | null;
  store?: boolean;
  background?: boolean | null;
  previous_response_id?: string | null;
  prompt_cache_key?: string | null;
  safety_identifier?: string | null;

  usage: ResponseUsage;
  openrouter_metadata?: OpenRouterMetadata;
};
