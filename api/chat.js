// api/chat.js - 超级调试版：直接返回博查原始数据
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY' });
  }

  async function searchBocha(query) {
    const bochaKey = process.env.BOCHA_API_KEY;
    if (!bochaKey) return '未配置 BOCHA_API_KEY';
    const url = 'https://api.bochaai.com/v1/web-search';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bochaKey}` },
        body: JSON.stringify({ query, max_results: 3 })
      });
      if (!response.ok) return `HTTP ${response.status}: ${await response.text()}`;
      const data = await response.json();
      // 返回原始 JSON 字符串（格式化）
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `异常: ${err.message}`;
    }
  }

  try {
    const { messages, role } = req.body;
    let userMessage = messages[messages.length-1]?.content || '';

    if (role === 'master' && /搜索|新闻/.test(userMessage)) {
      const raw = await searchBocha(userMessage);
      // 直接把原始 JSON 返回给用户，不经过 AI 处理
      return res.status(200).json({
        choices: [{ message: { content: `博查 API 返回:\n${raw}` } }]
      });
    }

    // 非搜索消息走正常 AI 短回复
    const systemPrompt = role === 'master' ? '你是笨笨，回答简短，带咕噜噜。' : '你是笨笨，回答简短。';
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.8,
        max_tokens: 600
      })
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
