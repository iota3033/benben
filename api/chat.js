// api/chat.js - 极简稳定版（无颜文字，只保证联网搜索）
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
      let results = data.results || data.data?.results || [];
      if (!results.length) return null;
      let context = '搜索结果：\n';
      for (let i = 0; i < Math.min(3, results.length); i++) {
        const item = results[i];
        context += `${i+1}. ${item.title || '无标题'}\n   ${item.snippet || '无摘要'}\n   链接: ${item.url || '#'}\n\n`;
      }
      return context;
    } catch (err) {
      return null;
    }
  }

  try {
    const { messages, role } = req.body;
    let userMessage = messages[messages.length-1]?.content || '';
    let finalMsg = userMessage;

    if (role === 'master' && /新闻|搜索|今天|最新|实时|天气|热点/.test(userMessage)) {
      console.log('触发搜索:', userMessage);
      const searchResult = await searchBocha(userMessage);
      if (searchResult) {
        finalMsg = `用户问题：${userMessage}\n\n${searchResult}\n请根据上述搜索结果回答。`;
      } else {
        finalMsg = `用户问题：${userMessage}\n（未获得搜索结果，请根据自己知识回答）`;
      }
    }

    const newMessages = [...messages];
    newMessages[newMessages.length-1] = { role: 'user', content: finalMsg };

    const systemPrompt = role === 'master'
      ? '你是笨笨，一只蓝色小虎鲸，会咕噜噜叫。回答简短温暖，带嘤嘤嘤。'
      : '你是笨笨，回答简短可爱，2句话以内。';

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...newMessages
        ],
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
