export type User = { id: number; email: string; created_at: string };
export type Conversation = { id: number; title: string | null; created_at: string; updated_at: string };
export type Message = { id: number; role: "user" | "assistant"; content: string; created_at: string };
export type ConversationDetail = Conversation & { messages: Message[] };
export type ApiStatus = "waking" | "loading" | "idle";

const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://llm-chatbot-qacm.onrender.com").replace(/\/$/, "");
const tokenKey = "llm_chatbot_token";
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export const getToken = () => typeof window === "undefined" ? null : localStorage.getItem(tokenKey);
export const setToken = (token: string) => localStorage.setItem(tokenKey, token);
export const clearToken = () => localStorage.removeItem(tokenKey);
function messageFor(body: unknown, fallback: string) { if (typeof body === "object" && body && "detail" in body && typeof (body as { detail: unknown }).detail === "string") return (body as { detail: string }).detail; return fallback; }
async function request<T>(path: string, options: RequestInit = {}, onStatus?: (s: ApiStatus) => void): Promise<T> {
  onStatus?.("waking"); let response: Response;
  try { response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...options.headers } }); } catch { throw new ApiError(0, "Unable to reach the server. Check your connection and try again later."); }
  onStatus?.("loading"); let body: unknown = null; try { body = await response.json(); } catch { /* empty response */ }
  if (!response.ok) throw new ApiError(response.status, messageFor(body, `Request failed (${response.status}).`)); return body as T;
}
export const api = {
  signup: (email: string, password: string, status?: (s: ApiStatus) => void) => request<{ access_token: string }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }, status),
  login: (email: string, password: string, status?: (s: ApiStatus) => void) => request<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, status),
  me: (status?: (s: ApiStatus) => void) => request<User>("/auth/me", {}, status),
  conversations: (status?: (s: ApiStatus) => void) => request<Conversation[]>("/conversations", {}, status),
  conversation: (id: number) => request<ConversationDetail>(`/conversations/${id}`),
  createConversation: (title?: string) => request<Conversation>("/conversations", { method: "POST", body: JSON.stringify({ title }) }),
  renameConversation: (id: number, title: string) => request<Conversation>(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteConversation: (id: number) => request<void>(`/conversations/${id}`, { method: "DELETE" }),
};
export async function streamChat(conversationId: number, content: string, handlers: { onContent: (part: string) => void; onError: (message: string) => void; onDone: () => void }) {
  let response: Response; try { response = await fetch(`${baseUrl}/chat/streams`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ conversation_id: conversationId, content }) }); } catch { throw new ApiError(0, "The connection to the server was interrupted. Your message was saved, but no response was generated."); }
  if (!response.ok) { let body: unknown = null; try { body = await response.json(); } catch { /* ignore */ } throw new ApiError(response.status, messageFor(body, "The message could not be sent.")); }
  if (!response.body) throw new ApiError(0, "The server returned an invalid streaming response.");
  const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = "", complete = false, generationFailed = false;
  const process = (event: string) => { const name = event.match(/^event:\s*(.+)$/m)?.[1]?.trim(), data = event.match(/^data:\s*(.+)$/m)?.[1]; if (!data) return; let parsed: { content?: unknown; error?: unknown }; try { parsed = JSON.parse(data); } catch { throw new ApiError(0, "The server returned malformed streaming data."); } if (typeof parsed.error === "string") { generationFailed = true; handlers.onError(parsed.error); return; } if (typeof parsed.content === "string") handlers.onContent(parsed.content); if (name === "done" && Object.keys(parsed).length === 0) { complete = true; handlers.onDone(); } };
  try { while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const events = buffer.split("\n\n"); buffer = events.pop() || ""; events.forEach(process); } if (!complete && !generationFailed) throw new ApiError(0, "The response stream ended unexpectedly. Your message was saved, but no response was generated."); } finally { reader.releaseLock(); }
}
