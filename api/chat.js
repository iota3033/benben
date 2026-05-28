// api/chat.js - 最终稳定版（使用调试版已验证的 JSON 输出）
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
    if (!bochaKey) return null;
    const url = 'https://api.bochaai.com/v1/web-search';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bochaKey}`
        },
        body: JSON.stringify({ query, max_results: 3 })
      });
      if (!response.ok) return null;
      const data = await response.json();
      // 直接取出 results 数组，格式化为易读文本
      const results = data.results;
      if (!results || !results.length) return null;
      let context = '搜索结果：\n';
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        context += `${i+1}. ${r.title || '无标题'}\n   摘要: ${r.snippet || '无摘要'}\n   链接: ${r.url || '无链接'}\n\n`;
      }
      console.log('生成搜索结果上下文长度:', context.length);
      return context;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  try {
    const { messages, role } = req.body;
    let userMessage = messages[messages.length - 1]?.content || '';
    let finalUserMessage = userMessage;

    if (role === 'master') {
      const keywords = ['新闻', '搜索', '今天', '最新', '实时', '天气', '热点'];
      const needSearch = keywords.some(kw => userMessage.includes(kw));
      if (needSearch) {
        console.log('触发搜索:', userMessage);
        const searchResult = await searchBocha(userMessage);
        if (searchResult) {
          finalUserMessage = `用户问题：${userMessage}\n\n${searchResult}\n请根据上述搜索结果回答用户的问题。`;
          console.log('搜索结果已注入，长度:', searchResult.length);
        } else {
          finalUserMessage = `用户问题：${userMessage}\n（搜索失败，未获得结果）`;
          console.log('搜索失败');
        }
      }
    }

    const newMessages = [...messages];
    newMessages[newMessages.length - 1] = { role: 'user', content: finalUserMessage };

    const systemPrompt = role === 'master'
      ? '你是笨笨，一只蓝色小虎鲸。说话带“嘤嘤嘤”和“咕噜噜”，回答简短温暖。'
      : '你是笨笨，回答简短可爱，不超过两句话。';

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...newMessages],
        temperature: 0.8,
        max_tokens: 600
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
