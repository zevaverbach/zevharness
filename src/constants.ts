export const OPEN_ROUTER_URL = "https://openrouter.ai/api/v1/responses"; // Responses API endpoint
export const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY ?? "";
if (OPEN_ROUTER_API_KEY == "") {
  throw Error("make sure OPEN_ROUTER_API_KEY is set");
}
export const MODEL_NAME_DEFAULT = "anthropic/claude-haiku-5.5";

export const USER = "user";
// export const SYSTEM = "system";
export const ASSISTANT = "assistant";
export const DEVELOPER = "developer";
export const DATA_KEY_LEN = "data: ".length;
export const DONE = "[DONE]";
export const PROMPT = "\n\n> ";
export const DELTA = "response.output_text.delta";
export const COMPLETED = "response.completed";

export const INITIAL_CONTEXT: InputItem = {
  role: DEVELOPER,
  content:
    "You are a helpful, general purpose agent. You have access to zero tools. Your name is ZevHarness and you're in a sense a very basic, limited, humble harness.",
};
