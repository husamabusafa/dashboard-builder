import { DefaultChatTransport } from "ai";

export function createHsafaTransport(baseUrl: string, agentId: string, chatId: string) {
  return new DefaultChatTransport({
    api: `${baseUrl}/api/run/${agentId}`,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const enhancedBody = { ...body, chatId };
      return fetch(input, { ...init, body: JSON.stringify(enhancedBody) });
    },
  });
}


