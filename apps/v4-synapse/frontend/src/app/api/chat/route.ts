import Anthropic from '@anthropic-ai/sdk';
import { getPersona, getToolsList, callTool } from '@/lib/mcp-client';

const anthropic = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5-20250514';
const MAX_TOOL_ROUNDS = 5;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolExecution {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  success: boolean;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, userId } = body as { messages: ChatMessage[]; userId: string };

    if (!userId) {
      return Response.json({ error: '缺少 userId' }, { status: 400 });
    }

    // 1. 获取 persona + 工具列表
    const [personaData, toolsData] = await Promise.all([
      getPersona(userId),
      getToolsList(userId),
    ]);

    // 2. 转换为 Claude 工具格式
    const claudeTools: Anthropic.Tool[] = toolsData.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    // 3. 构建 Claude 消息
    const claudeMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const toolExecutions: ToolExecution[] = [];
    let finalText = '';

    // 4. Tool-use 循环
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: personaData.persona.systemPrompt,
        tools: claudeTools,
        messages: claudeMessages,
      });

      // 提取文本和工具调用
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      );
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      // 如果没有工具调用，返回文本
      if (toolUseBlocks.length === 0) {
        finalText = textBlocks.map((b) => b.text).join('');
        break;
      }

      // 执行工具调用
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        const mcpResult = await callTool(
          userId,
          block.name,
          block.input as Record<string, unknown>,
        );

        toolExecutions.push({
          tool: block.name,
          input: block.input as Record<string, unknown>,
          output: mcpResult.data,
          success: mcpResult.success,
        });

        // 提取 MCP 工具返回的文本内容
        let resultContent: string;
        if (mcpResult.success && mcpResult.data && typeof mcpResult.data === 'object') {
          const data = mcpResult.data as { content?: Array<{ text?: string }> };
          if (data.content?.[0]?.text) {
            resultContent = data.content[0].text;
          } else {
            resultContent = JSON.stringify(mcpResult.data);
          }
        } else {
          resultContent = JSON.stringify({ error: mcpResult.error ?? '工具执行失败' });
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: resultContent,
        });
      }

      // 追加 assistant 消息 + tool_result
      claudeMessages.push({ role: 'assistant', content: response.content });
      claudeMessages.push({ role: 'user', content: toolResults });

      // 如果是最后一轮，附加文本
      if (round === MAX_TOOL_ROUNDS - 1) {
        finalText = textBlocks.map((b) => b.text).join('') || '工具调用已完成。';
      }
    }

    return Response.json({
      message: finalText,
      toolExecutions,
      persona: {
        id: personaData.persona.id,
        name: personaData.persona.name,
      },
    });
  } catch (err) {
    console.error('[Chat API Error]', err);
    const message = err instanceof Error ? err.message : '服务内部错误';
    return Response.json({ error: message }, { status: 500 });
  }
}
