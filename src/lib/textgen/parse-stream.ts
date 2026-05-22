/**
 * 文本补全 SSE / JSONL 流式解析
 * 兼容多家后端：
 *   - OOBA / Mancer / vLLM / Aphrodite / Tabby / Generic / Featherless / OpenRouter (OpenAI-like)
 *   - llama.cpp 原生
 *   - KoboldCpp
 *   - Ollama (NDJSON)
 */

export interface ConsumeStreamOptions {
  /** 每收到一段新 token 时回调当前 fullContent */
  onChunk: (fullContent: string) => void;
  /** 不抛错，结束时返回 fullContent */
  signal?: AbortSignal;
}

/** 从 SSE / NDJSON 字符串中提取本次新增 token */
function extractToken(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const j = json as Record<string, unknown> & {
    choices?: Array<{ text?: string; delta?: { content?: string } }>;
  };
  const choice = j.choices?.[0];
  return (
    choice?.text ??
    choice?.delta?.content ??
    (typeof j.content === "string" ? (j.content as string) : "") ??
    (typeof j.token === "string"
      ? (j.token as string)
      : typeof (j.token as Record<string, unknown> | undefined)?.text === "string"
        ? ((j.token as Record<string, unknown>).text as string)
        : "") ??
    (typeof j.response === "string" ? (j.response as string) : "") ??
    ""
  );
}

/** 消费一个 textgen SSE/NDJSON 流，按行解析并回调 onChunk */
export async function consumeTextgenStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: ConsumeStreamOptions,
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      // SSE 注释行
      if (line.startsWith(":")) continue;

      let payload = line;
      if (payload.startsWith("data:")) payload = payload.slice(5).trim();
      if (payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload);
        const piece = extractToken(json);
        if (piece) {
          full += piece;
          options.onChunk(full);
        }
      } catch {
        // 非 JSON 行（部分后端可能直接输出纯文本）按原样追加
        full += payload;
        options.onChunk(full);
      }
    }
  }

  // 末尾未换行的缓冲
  const tail = buffer.trim();
  if (tail) {
    const payload = tail.startsWith("data:") ? tail.slice(5).trim() : tail;
    if (payload && payload !== "[DONE]") {
      try {
        const json = JSON.parse(payload);
        const piece = extractToken(json);
        if (piece) {
          full += piece;
          options.onChunk(full);
        }
      } catch {
        // ignore
      }
    }
  }

  return full;
}

/** /api/chat（vercel AI SDK）的纯文本流；逐 chunk 直接拼接 */
export async function consumePlainTextStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: ConsumeStreamOptions,
): Promise<string> {
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    options.onChunk(full);
  }
  return full;
}
