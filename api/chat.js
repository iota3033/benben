// api/chat.js - 直通版：直接返回搜索结果
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, role } = req.body;
  const userMessage = messages[messages.length-1]?.content || '';

  // 只处理主人模式且包含“搜索”的消息
  if (role === 'master' && (userMessage.includes('搜索') || userMessage.includes('新闻'))) {
    const bochaKey = process.env.BOCHA_API_KEY;
    if (!bochaKey) {
      return res.status(200).json({ choices: [{ message: { content: '错误：未配置 BOCHA_API_KEY' } }] });
    }
    const url = 'https://api.bochaai.com/v1/web-search';
    const query = userMessage.replace(/搜索|新闻/g, '').trim() || '新闻';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bochaKey}`
        },
        body: JSON.stringify({ query, max_results: 3 })
      });
      const data = await response.json();
      const results = data.results || [];
      let reply = '【搜索结果】\n';
      for (let i=0; i<Math.min(3, results.length); i++) {
        reply += `${i+1}. ${results[i].title}\n   ${results[i].snippet}\n   链接: ${results[i].url}\n\n`;
      }
      return res.status(200).json({ choices: [{ message: { content: reply } }] });
    } catch (err) {
      return res.status(200).json({ choices: [{ message: { content: `请求失败: ${err.message}` } }] });
    }
  }

  // 其他消息走普通 AI 回答（极简）
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY' });
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: '你是笨笨，回答简短温暖。' }, ...messages],
      temperature: 0.8,
      max_tokens: 400
    })
  });
  const data = await response.json();
  return res.status(200).json(data);
}
