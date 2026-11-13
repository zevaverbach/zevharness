import { formatOpenRouterError } from "./errors.ts";
import { createSmoothWriter } from "./smooth.ts";
import {
  DATA_KEY_LEN,
  DONE,
  INITIAL_CONTEXT,
  MODEL_NAME_DEFAULT,
  OPEN_ROUTER_API_KEY,
  OPEN_ROUTER_URL,
  USER,
  PROMPT,
  DELTA,
  COMPLETED,
} from "./constants.ts";

process.stdin.setDefaultEncoding("utf-8");

export async function agentLoop(): Promise<void> {
  let context: Array<InputItem | OutputItem> = [INITIAL_CONTEXT];
  let response: ResponsesResponseType | ReadableStream | null;
  const smooth = createSmoothWriter();

  smooth.print("Hey, welcome to ZevHarness, how can I help?\n> ");

  for await (const chunk of process.stdin) {
    context.push({ role: USER, content: String(chunk) });

    try {
      response = await callModel(MODEL_NAME_DEFAULT, context);
      if (!response) {
        throw Error("no response");
      }
      const decoder = new TextDecoder();
      let buffer = "";

      for await (const chunk of response as ReadableStream) {
        let decodedChunk = decoder.decode(chunk);
        let messageObj, message;
        for (const d of decodedChunk.split("\n\n")) {
          if (buffer.length > 0) {
            message = buffer + d;
          } else {
            message = d.slice(DATA_KEY_LEN);
          }

          if (message == "") {
            continue;
          }
          if (message == DONE) {
            break;
          }
          try {
            messageObj = JSON.parse(message);
            if (buffer) {
              buffer = "";
            }
          } catch (err) {
            // it's a partial payload
            buffer = message;
            continue;
          }
          if (messageObj.type == DELTA) {
            const { delta } = messageObj;
            smooth.print(delta);
          } else if (messageObj.type == COMPLETED) {
            context.push(...messageObj.response.output);
          }
        }
      }
      await smooth.flush();
    } catch (err) {
      console.error(`\x1b[31m${err instanceof Error ? err.message : String(err)}\x1b[0m`);
    }
    smooth.print(PROMPT);
  }
}

export async function callModel(
  model: string = MODEL_NAME_DEFAULT,
  content: Array<InputItem | OutputItem>
): Promise<ReadableStream | null> {
  const body: RequestResponsesType = { model, input: content, stream: true };
  const res = await fetch(OPEN_ROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPEN_ROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(formatOpenRouterError(res.status, await res.text()));
  }
  return res.body;
}

agentLoop();
