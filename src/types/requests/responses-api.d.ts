/**
 * OpenRouter Responses API REQUEST types (POST /api/v1/responses).
 *
 * Scope: request body only. Response objects and streaming events (`response.*`)
 * are NOT covered here.
 *
 * Source: OpenRouter's OpenAPI spec (https://openrouter.ai/openapi.json), the
 * "Create a response" reference, and the Responses guides. The spec has no
 * `required` array on ResponsesRequest, so even `input` and `model` are optional
 * at the schema level. Many enums are "open" (unknown values allowed).
 *
 * Marker:
 *   [?]  not confirmed in the spec (base fields not seen, or taken from docs examples).
 */

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

type ToolCallStatus = "in_progress" | "completed" | "incomplete";

type ReasoningEffort = "max" | "xhigh" | "high" | "medium" | "low" | "minimal" | "none";

type PromptCacheBreakpoint = { mode: "explicit"; ttl?: string | null }; // "30m" | "12h"

// ---------------------------------------------------------------------------
// Content parts
// ---------------------------------------------------------------------------

/** Note the `input_` prefix on user-side parts (Chat Completions uses `text` / `image_url`). */
type InputTextPart = {
  type: "input_text";
  text: string;
  prompt_cache_breakpoint?: PromptCacheBreakpoint;
};

type InputImagePart = {
  type: "input_image";
  detail: "auto" | "high" | "low" | "original"; // required
  image_url?: string | null; // URL or base64 data URL
  file_id?: string | null;
};

type InputFilePart = {
  type: "input_file";
  file_data?: string;
  file_id?: string | null;
  file_url?: string;
  filename?: string;
};

type InputAudioPart = {
  type: "input_audio";
  input_audio: { data: string; format: "mp3" | "wav" };
};

type InputVideoPart = {
  type: "input_video";
  video_url: string;
  processing?: "agentic" | "static";
};

type InputContentPart = InputTextPart | InputImagePart | InputFilePart | InputAudioPart | InputVideoPart;

/** Assistant parts, used when echoing earlier output back into `input`. */
type OutputTextPart = { type: "output_text"; text: string; annotations: unknown[] };
type RefusalPart = { type: "refusal"; refusal: string };
type OutputContentPart = OutputTextPart | RefusalPart;

// ---------------------------------------------------------------------------
// Input items: messages
// ---------------------------------------------------------------------------

/**
 * Shorthand `{ role, content }`, closest to a Chat Completions message.
 * There is no `role: "tool"`; tool results are `function_call_output` items.
 */
type EasyInputMessage = {
  type?: "message";
  role: "user" | "system" | "assistant" | "developer";
  content: string | InputContentPart[] | null;
  phase?: "commentary" | "final_answer" | null;
};

/** Strict input message: `assistant` is not allowed here. */
type InputMessageItem = {
  type?: "message";
  id: string;
  role: "user" | "system" | "developer";
  content: InputContentPart[] | null;
};

/** A previous assistant turn echoed back as returned in `response.output`. */
type OutputMessageItem = {
  type: "message";
  role: "assistant";
  id: string;
  status: ToolCallStatus;
  content: OutputContentPart[];
};

// ---------------------------------------------------------------------------
// Input items: function & custom tools
// ---------------------------------------------------------------------------

/** Replaces `assistant.tool_calls[]` from Chat Completions. */
type FunctionCallItem = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string; // JSON-encoded string
  id?: string | null;
  async?: boolean | null;
  namespace?: string | null;
  status?: ToolCallStatus | null;
  subagent_id?: string | null;
  subagent_items?: ({ type: string } & Record<string, unknown>)[] | null;
};

/** Replaces `{ role: "tool", tool_call_id, content }`. */
type FunctionCallOutputItem = {
  type: "function_call_output";
  call_id: string;
  output: string | (InputTextPart | InputImagePart | InputFilePart)[];
  id?: string | null;
  status?: ToolCallStatus | null;
};

type CustomToolCallItem = {
  type: "custom_tool_call";
  call_id: string;
  name: string;
  input: string;
  id?: string;
  async?: boolean;
  namespace?: string;
  status?: ToolCallStatus;
};

type CustomToolCallOutputItem = {
  type: "custom_tool_call_output";
  call_id: string;
  output: string | (InputTextPart | InputImagePart | InputFilePart)[];
  id?: string;
};

// ---------------------------------------------------------------------------
// Input items: reasoning
// ---------------------------------------------------------------------------

type ReasoningFormat =
  | "unknown"
  | "openai-responses-v1"
  | "azure-openai-responses-v1"
  | "bedrock-openai-responses-v1"
  | "bedrock-xai-responses-v1"
  | "xai-responses-v1"
  | "meta-responses-v1"
  | "openrouter-stealth-v1"
  | "anthropic-claude-v1"
  | "google-gemini-v1";

/** Send these back, in order, to preserve reasoning across turns. */
type ReasoningItem = {
  // OutputItemReasoning base (required: type, id, summary)
  type: "reasoning";
  id: string;
  summary: { type: "summary_text"; text: string }[];
  content?: { type: "reasoning_text"; text: string }[] | null;
  encrypted_content?: string | null;
  status?: "completed" | "incomplete" | "in_progress";
  // ReasoningItem extensions
  format?: ReasoningFormat | null;
  signature?: string | null; // Anthropic-style thinking signature
};

/** Change effort mid-conversation. Two adjacent updates are rejected; model must support it. */
type ConfigurationUpdateItem = {
  type: "configuration_update";
  reasoning: { effort: ReasoningEffort }; // additional properties not allowed
};

// ---------------------------------------------------------------------------
// Input items: apply_patch / shell / local shell
// ---------------------------------------------------------------------------

type ApplyPatchCallOperation =
  | { type: "create_file"; path: string; diff: string }
  | { type: "update_file"; path: string; diff: string }
  | { type: "delete_file"; path: string };

type ApplyPatchCallItem = {
  type: "apply_patch_call";
  call_id: string;
  status: "in_progress" | "completed";
  operation: ApplyPatchCallOperation;
  id?: string | null;
};

type ApplyPatchCallOutputItem = {
  type: "apply_patch_call_output";
  call_id: string;
  status: "completed" | "failed";
  id?: string | null;
  output?: string | null;
};

type LocalShellCallItem = {
  type: "local_shell_call";
  id: string;
  call_id: string;
  status: string;
  action: {
    type: "exec";
    command: string[];
    env: Record<string, string>;
    timeout_ms?: number | null;
    user?: string;
    working_directory?: string;
  };
};

type LocalShellCallOutputItem = {
  type: "local_shell_call_output";
  id: string;
  output: string;
  status?: ToolCallStatus | null;
};

type ShellCallItem = {
  type: "shell_call";
  call_id: string;
  action: { commands: string[]; max_output_length?: number; timeout_ms?: number };
  arguments?: string | null;
  id?: string;
  status?: ToolCallStatus; // ShellCallStatus
  environment?: unknown;
};

type ShellCallOutputContent = {
  stdout: string;
  stderr: string;
  outcome: { type: "exit"; exit_code: number } | { type: "timeout" };
};

type ShellCallOutputItem = {
  type: "shell_call_output";
  call_id: string;
  output: ShellCallOutputContent[];
  container_id?: string;
  error?: unknown;
  files?: unknown[]; // container file citations, max 10
  id?: string;
  max_output_length?: number;
  status?: ToolCallStatus;
};

// ---------------------------------------------------------------------------
// Input items: MCP, tool search, context management, misc
// ---------------------------------------------------------------------------

type McpListToolsItem = {
  type: "mcp_list_tools";
  id: string;
  server_label: string;
  tools: { name: string; input_schema: Record<string, unknown>; description?: string; annotations?: unknown }[];
};

type McpApprovalRequestItem = {
  type: "mcp_approval_request";
  id: string;
  name: string;
  arguments: string;
  server_label: string;
};

type McpApprovalResponseItem = {
  type: "mcp_approval_response";
  approval_request_id: string;
  approve: boolean;
  id?: string;
  reason?: string;
};

type McpCallItem = {
  type: "mcp_call";
  id: string;
  name: string;
  arguments: string;
  server_label: string;
  output?: string | null;
  error?: string | null;
};

type ToolSearchCallItem = {
  type: "tool_search_call";
  call_id: string;
  execution: "server" | "client";
  arguments?: unknown;
  id?: string;
  status?: ToolCallStatus | null;
};

type ToolSearchOutputItem = {
  type: "tool_search_output";
  call_id: string;
  execution: "server" | "client";
  tools: unknown[];
  id?: string;
  status?: ToolCallStatus | null;
};

type CompactionItem = { type: "compaction"; encrypted_content: string; id?: string };
type ContextCompactionItem = { type: "context_compaction"; encrypted_content?: string; id?: string };
type ItemReferenceItem = { type: "item_reference"; id: string };

type AdditionalToolsItem = {
  type: "additional_tools";
  role: "unknown" | "user" | "assistant" | "system" | "critic" | "discriminator" | "developer" | "tool";
  tools: unknown[];
};

type AgentMessageItem = {
  type: "agent_message";
  author: string;
  recipient: string;
  content: (InputTextPart | InputImagePart | { type: "encrypted_content"; [k: string]: unknown })[];
  id?: string;
  agent?: string;
};

/** Output-only image generation call that may be echoed back; fields not seen. */
type UnknownInputItem = { type: string; [key: string]: unknown };

type InputItem =
  | EasyInputMessage
  | InputMessageItem
  | OutputMessageItem
  | FunctionCallItem
  | FunctionCallOutputItem
  | CustomToolCallItem
  | CustomToolCallOutputItem
  | ReasoningItem
  | ConfigurationUpdateItem
  | ApplyPatchCallItem
  | ApplyPatchCallOutputItem
  | LocalShellCallItem
  | LocalShellCallOutputItem
  | ShellCallItem
  | ShellCallOutputItem
  | McpListToolsItem
  | McpApprovalRequestItem
  | McpApprovalResponseItem
  | McpCallItem
  | ToolSearchCallItem
  | ToolSearchOutputItem
  | CompactionItem
  | ContextCompactionItem
  | ItemReferenceItem
  | AdditionalToolsItem
  | AgentMessageItem;

/** Use when round-tripping `response.output` wholesale (web_search_call, image_generation_call, ...). */
type InputItemLoose = InputItem | UnknownInputItem;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

type FunctionTool = {
  type: "function";
  name: string;
  description?: string;
  parameters: Record<string, unknown> | null; // JSON Schema
  strict?: boolean | null;
  // OpenRouter extensions
  allowed_callers?: ("direct" | "programmatic")[] | null;
  async?: boolean;
  defer_loading?: boolean;
  output_schema?: Record<string, unknown> | null;
};

type CustomTool = {
  type: "custom";
  name: string;
  description?: string;
  async?: boolean;
  defer_loading?: boolean;
  format?: { type: "text" } | { type: "grammar"; definition: string; syntax: "lark" | "regex" };
};

type NamespaceTool = {
  type: "namespace";
  name: string;
  description: string;
  tools: ((Omit<FunctionTool, "parameters"> & { parameters?: Record<string, unknown> | null }) | CustomTool)[];
};

type ComputerUseTool = {
  type: "computer_use_preview";
  display_height: number;
  display_width: number;
  environment: "windows" | "mac" | "linux" | "ubuntu" | "browser";
};

type CodeInterpreterTool = {
  type: "code_interpreter";
  container: string | { type: "auto"; file_ids?: string[]; memory_limit?: "1g" | "4g" | "16g" | "64g" | null };
};

type McpTool = {
  type: "mcp";
  server_label: string;
  server_url?: string;
  server_description?: string;
  authorization?: string;
  headers?: Record<string, string> | null;
  connector_id?:
    | "connector_dropbox"
    | "connector_gmail"
    | "connector_googlecalendar"
    | "connector_googledrive"
    | "connector_microsoftteams"
    | "connector_outlookcalendar"
    | "connector_outlookemail"
    | "connector_sharepoint";
  allowed_tools?: string[] | { read_only?: boolean; tool_names?: string[] } | null;
  require_approval?:
    | "always"
    | "never"
    | { always?: { tool_names?: string[] }; never?: { tool_names?: string[] } }
    | null;
};

type ImageGenerationTool = {
  type: "image_generation";
  model?: string;
  background?: "transparent" | "opaque" | "auto";
  input_fidelity?: "high" | "low" | null;
  input_image_mask?: { file_id?: string; image_url?: string };
  moderation?: "auto" | "low";
  output_compression?: number;
  output_format?: "png" | "webp" | "jpeg";
  partial_images?: number;
  quality?: "low" | "medium" | "high" | "auto";
  size?: string;
};

type SimpleServerTool = { type: "local_shell" | "shell" | "apply_patch" };

/** X (Twitter) search alongside native web search. Only for endpoints with native X search; billed separately. */
type XSearchOptions = {
  allowed_x_handles?: string[]; // max 20; not with excluded_x_handles
  excluded_x_handles?: string[]; // max 20; not with allowed_x_handles
  enable_image_understanding?: boolean;
  enable_video_understanding?: boolean;
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
};

/**
 * Four variants share one shape and differ only by `type`
 * (Legacy: web_search, Preview: web_search_preview[_2025_03_11], WebSearchServerTool: web_search_2025_08_26).
 * Only `type` is required.
 */
type WebSearchTool = {
  type: "web_search" | "web_search_2025_08_26" | "web_search_preview" | "web_search_preview_2025_03_11";
  engine?: string; // WebSearchEngineEnum, values not seen
  filters?: unknown; // WebSearchDomainFilter, shape not seen
  max_results?: number; // default 5
  max_uses?: number; // exa/firecrawl/parallel/perplexity engines
  mode?: string; // WebSearchMode, values not seen
  search_context_size?: "low" | "medium" | "high";
  /** Preview variants: { type: "approximate", city, country, region, timezone } (all nullable). Others use WebSearchUserLocation (not seen). */
  user_location?: {
    type: "approximate";
    city?: string | null;
    country?: string | null;
    region?: string | null;
    timezone?: string | null;
  } | null;
  x_search?: XSearchOptions;
};

type FileSearchFilter =
  | {
      key: string;
      type: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
      value: string | number | boolean | (string | number)[];
    }
  | { type: string; filters: unknown[] }; // CompoundFilter, shape not seen

type FileSearchTool = {
  type: "file_search";
  vector_store_ids: string[];
  max_num_results?: number;
  filters?: FileSearchFilter | null;
  ranking_options?: { ranker?: "auto" | "default-2024-11-15"; score_threshold?: number };
};

// --- OpenRouter-prefixed server tools --------------------------------------

type OrEngine = "auto" | "native" | "openrouter";
type OrContainerEnv =
  | { type: "container_auto"; file_ids?: string[]; network_policy?: ContainerNetworkPolicy }
  | { type: "container_reference"; container_id: string; file_ids?: string[]; network_policy?: ContainerNetworkPolicy };
type ContainerNetworkPolicy = { type: "disabled" } | { type: "allowlist"; allowed_domains: string[] }; // 1-50 entries

type OrReasoning = { effort?: ReasoningEffort; max_tokens?: number };

/** Server tools take their config under `parameters`. */
type OpenRouterServerTool =
  | {
      type: "openrouter:web_search";
      parameters?: {
        engine?: "native" | "exa" | "firecrawl" | "parallel" | "perplexity" | "auto";
        max_results?: number;
        max_characters?: number;
        max_total_results?: number; // default 50
        max_uses?: number;
        allowed_domains?: string[];
        excluded_domains?: string[];
        mode?: string;
        search_context_size?: "low" | "medium" | "high";
        user_location?: unknown;
        x_search?: unknown;
      };
    }
  | {
      type: "openrouter:web_fetch";
      parameters?: {
        allowed_domains?: string[];
        blocked_domains?: string[];
        engine?: "auto" | "native" | "openrouter" | "exa" | "parallel" | "firecrawl";
        max_content_tokens?: number;
        max_uses?: number;
      };
    }
  | { type: "openrouter:datetime"; parameters?: { timezone?: string } } // IANA, default UTC
  | { type: "openrouter:files"; parameters?: Record<string, never> }
  | {
      type: "openrouter:fusion";
      parameters?: {
        analysis_models?: string[]; // 1-8
        model?: string;
        max_completion_tokens?: number; // default 16000
        max_tool_calls?: number; // 1-16, default 4
        reasoning?: OrReasoning;
        temperature?: number;
        tools?: unknown[];
        cache_control?: unknown;
      };
    }
  | { type: "openrouter:image_generation"; parameters?: { model?: string; [k: string]: unknown } }
  | { type: "openrouter:experimental__search_models"; parameters?: { max_results?: number } } // default 5, max 20
  | { type: "openrouter:apply_patch"; parameters?: { engine?: OrEngine } } // Responses API only
  | { type: "openrouter:bash"; parameters?: { engine?: OrEngine; environment?: OrContainerEnv } }
  | { type: "openrouter:shell"; parameters?: { engine?: "auto" | "openrouter"; environment?: OrContainerEnv } }
  | { type: "openrouter:tool_search"; parameters?: { max_results?: number } } // default 5
  | {
      type: "openrouter:advisor";
      parameters?: {
        name?: string;
        model?: string;
        instructions?: string;
        max_completion_tokens?: number;
        forward_transcript?: boolean;
        reasoning?: OrReasoning;
        stream?: boolean;
        temperature?: number;
      };
    }
  | {
      type: "openrouter:subagent";
      parameters?: {
        name?: string;
        model?: string;
        instructions?: string;
        max_completion_tokens?: number;
        max_tool_calls?: number; // 1-25
        tools?: { type: string; parameters?: Record<string, unknown> }[]; // OpenRouter server tools only
        inherit_functions?: boolean; // experimental, Responses only
        inherited_function_names?: string[];
        reasoning?: OrReasoning;
        temperature?: number;
      };
    };

type Tool =
  | FunctionTool
  | CustomTool
  | NamespaceTool
  | ComputerUseTool
  | CodeInterpreterTool
  | McpTool
  | ImageGenerationTool
  | SimpleServerTool
  | WebSearchTool
  | FileSearchTool
  | OpenRouterServerTool;

/** If you declare `openrouter:tool_search`, at least one tool must stay non-deferred. */

type ToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; name: string }
  | { type: "web_search_preview" | "web_search_preview_2025_03_11" }
  | { type: "apply_patch" }
  | { type: "shell" }
  | { type: "allowed_tools"; mode: "auto" | "required"; tools: Record<string, unknown>[] };

/** Stop conditions for server-tool loops (OR-ed). */
type StopServerToolsWhen =
  | { type: "finish_reason_is"; reason: string }
  | { type: "has_tool_call"; tool_name: string }
  | { type: "max_cost"; max_cost_in_dollars: number }
  | { type: "max_tokens_used"; max_tokens: number }
  | { type: "step_count_is"; step_count: number };

type DeferredToolsSearchStrategy =
  | { type: "regex"; max_results?: number; miss_sources?: boolean; siblings?: boolean }
  | { type: "bm25"; max_results?: number; miss_sources?: boolean; siblings?: boolean; spread?: boolean }
  | { type: "custom"; tool_id: string; result_key: string; max_results?: number };

/** Opt-in deferred tool loading. protocol, profile, validation and search are required. */
type DeferredToolsControl = {
  protocol: "v1";
  profile: "portable" | "universal";
  validation: "runtime";
  search: DeferredToolsSearchStrategy;
  announce_catalog_changes?: boolean; // universal profile only
  cascade_mode?: "keywords" | "native";
  hint?: string; // 1-2000 chars
  interface?: "wrappers" | "code_mode";
  min_deferred_tools?: number;
  scope?: "all" | "mcp";
};

// ---------------------------------------------------------------------------
// Reasoning / text
// ---------------------------------------------------------------------------

type ReasoningConfig = {
  effort?: ReasoningEffort | null;
  summary?: "auto" | "concise" | "detailed" | null;
  /** GPT-5.6+ only */
  mode?: "standard" | "pro" | null;
  /** GPT-5.6+ only */
  context?: "auto" | "all_turns" | "current_turn" | null;
  /** Added on top of BaseReasoningConfig by ReasoningConfig */
  enabled?: boolean | null;
  max_tokens?: number | null;
};

type TextFormat =
  | { type: "text" }
  | { type: "json_object" }
  | {
      type: "json_schema";
      name: string;
      schema: Record<string, unknown>;
      description?: string;
      strict?: boolean | null;
    };

type TextConfig = {
  format?: TextFormat;
  verbosity?: "low" | "medium" | "high" | "xhigh" | "max" | null;
};

// ---------------------------------------------------------------------------
// OpenRouter routing
// ---------------------------------------------------------------------------

type Quantization =
  | "int4"
  | "int8"
  | "fp4"
  | "mxfp4"
  | "nvfp4"
  | "fp6"
  | "fp8"
  | "mxfp8"
  | "fp16"
  | "bf16"
  | "fp32"
  | "unknown";

type ProviderSort = "price" | "throughput" | "latency" | "exacto";

type Percentiles = { p50?: number | null; p75?: number | null; p90?: number | null; p99?: number | null };

type ProviderPreferences = {
  allow_fallbacks?: boolean | null;
  data_collection?: "allow" | "deny";
  zdr?: boolean | null;
  enforce_distillable_text?: boolean | null;
  require_parameters?: boolean | null;
  order?: string[] | null;
  only?: string[] | null;
  ignore?: string[] | null;
  quantizations?: Quantization[] | null;
  sort?: ProviderSort | { by?: ProviderSort | null; partition?: "model" | "none" | null } | null;
  max_price?: { prompt?: string; completion?: string; image?: string; audio?: string; request?: string };
  /** seconds (applies to p50) or percentile cutoffs */
  preferred_max_latency?: number | Percentiles | null;
  /** tokens/sec (applies to p50) or percentile cutoffs */
  preferred_min_throughput?: number | Percentiles | null;
  /** keyed by provider slug (case-insensitive); unrecognized keys are dropped */
  options?: Record<string, Record<string, unknown>>;
};

/** Discriminated by `id`: web, web-fetch, file-parser, response-healing, moderation,
 *  context-compression, auto-router, ... Settings vary per plugin. */
type RequestPlugin = { id: string; enabled?: boolean; [key: string]: unknown };

type TraceConfig = {
  trace_id?: string;
  trace_name?: string;
  span_name?: string;
  generation_name?: string;
  parent_span_id?: string;
  [custom: string]: unknown; // extra keys pass through as custom metadata
};

// ---------------------------------------------------------------------------
// The request
// ---------------------------------------------------------------------------

type RequestResponsesType = {
  // --- core -----------------------------------------------------------------
  model?: string; // single slug, e.g. "anthropic/claude-sonnet-4.5"
  models?: string[]; // fallback candidates
  /** A bare string is shorthand for one user message. Optional in the spec, but you want it. */
  input?: string | InputItemLoose[] | null;
  instructions?: string | null;

  // --- tools ----------------------------------------------------------------
  tools?: Tool[];
  tool_choice?: ToolChoice;
  parallel_tool_calls?: boolean | null;
  /** Server-tool agent steps. Default and max 30; ignored if stop_server_tools_when is set. */
  max_tool_calls?: number | null;
  /** Overrides max_tool_calls. Min 1 entry. */
  stop_server_tools_when?: StopServerToolsWhen[];

  // --- generation -----------------------------------------------------------
  max_output_tokens?: number | null;
  temperature?: number | null;
  top_p?: number | null;
  top_k?: number;
  frequency_penalty?: number | null;
  presence_penalty?: number | null;
  top_logprobs?: number | null;
  stop?: string | string[] | null; // up to 4
  reasoning?: ReasoningConfig | null;
  text?: TextConfig;
  modalities?: ("text" | "image")[];
  image_config?: Record<string, unknown>;

  // --- transport & state ----------------------------------------------------
  stream?: boolean; // default false
  store?: false; // stateless
  /** NOT SUPPORTED: any non-null value returns 400. Send full history in `input`. */
  previous_response_id?: null;
  background?: boolean | null;
  include?: (
    | "file_search_call.results"
    | "message.input_image.image_url"
    | "computer_call_output.output.image_url"
    | "reasoning.encrypted_content"
    | "code_interpreter_call.outputs"
  )[];
  truncation?: "auto" | "disabled" | null;
  service_tier?: "auto" | "default" | "fast" | "flex" | "priority" | "scale" | "ultrafast" | null;

  // --- caching --------------------------------------------------------------
  session_id?: string; // <=256 chars; sticky routing + cache grouping; beats x-session-id header
  prompt_cache_key?: string | null;
  prompt_cache_options?: { mode: "explicit"; ttl?: "30m" | "12h" } | null; // OpenAI GPT-5.6+ only
  /** Top level = automatic caching; on a block = explicit breakpoint. */
  cache_control?: { type: "ephemeral"; ttl?: string };

  // --- identity & metadata --------------------------------------------------
  user?: string; // <=256 chars
  safety_identifier?: string | null;
  metadata?: Record<string, string> | null; // <=16 pairs, key <=64 chars (no brackets), value <=512

  // --- OpenRouter-specific --------------------------------------------------
  provider?: ProviderPreferences;
  plugins?: RequestPlugin[];
  prompt?: { id: string; variables?: Record<string, string | InputTextPart | InputImagePart | InputFilePart> };
  debug?: { echo_upstream_body?: boolean }; // streaming only
  trace?: TraceConfig;
  deferred_tools?: DeferredToolsControl;
  access_programs?: { cyber?: "standard" | "daybreak_blue" | "daybreak_red" }; // BYOK only, else 400
  /** @deprecated use provider.sort.partition */
  route?: unknown;
};
