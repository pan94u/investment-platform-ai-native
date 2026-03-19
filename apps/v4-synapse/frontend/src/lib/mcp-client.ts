/**
 * V1 MCP Client — 连接 V1 后端的 MCP 接口
 */

const MCP_BASE = process.env.V1_MCP_URL ?? 'http://localhost:3101/api/mcp';

interface PersonaData {
  userId: string;
  role: string;
  persona: {
    id: string;
    name: string;
    description: string;
    allowedTools: string[];
    systemPrompt: string;
  };
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface ToolsListData {
  persona: { id: string; name: string; description: string };
  tools: ToolDefinition[];
  totalTools: number;
}

export async function getPersona(userId: string): Promise<PersonaData> {
  const res = await fetch(`${MCP_BASE}/personas`, {
    headers: { 'X-User-Id': userId },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? '获取 persona 失败');
  return json.data;
}

export async function getToolsList(userId: string): Promise<ToolsListData> {
  const res = await fetch(`${MCP_BASE}/tools/list`, {
    headers: { 'X-User-Id': userId },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? '获取工具列表失败');
  return json.data;
}

export async function callTool(
  userId: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; data: unknown; error: string | null }> {
  const res = await fetch(`${MCP_BASE}/tools/call`, {
    method: 'POST',
    headers: { 'X-User-Id': userId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, arguments: args }),
  });
  return res.json();
}

export async function getUsers(): Promise<Array<{ id: string; username: string; name: string; role: string; department: string }>> {
  const base = process.env.V1_API_URL ?? 'http://localhost:3101';
  const res = await fetch(`${base}/api/auth/users`);
  const json = await res.json();
  return json.data ?? [];
}
