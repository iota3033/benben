// api/chat.js - 带详细日志的修复版
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
    if (!bochaKey) {
      console.log('BOCHA_API_KEY 未配置');
      return null;
    }
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
      if (!response.ok) {
        console.log(`博查响应错误: ${response.status}`);
        return null;
      }
      const data = await response.json();
      console.log('博查原始数据 keys:', Object.keys(data));
      // 调试版显示 data.results 存在
      const results = data.results;
      if (!results || results.length === 0) {
        console.log('results 为空或不存在');
        return null;
      }
      console.log(`获取到 ${results.length} 条结果`);
      let context = '搜索结果：\n';
      for (let i = 0; i < Math.min(3, results.length); i++) {
        const item = results[i];
        const title = item.title || '无标题';
        const snippet = item.snippet || '无摘要';
        const link = item.url || '#';
        context += `${i+1}. ${title}\n   ${snippet}\n   链接: ${link}\n\n`;
      }
      console.log('搜索结果拼接完成，长度:', context.length);
      return context;
    } catch (err) {
      console.error('搜索异常:', err);
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
          finalUserMessage = `用户问题：${userMessage}\n\n${searchResult}\n请根据上述搜索结果回答。`;
          console.log('搜索结果已注入');
        } else {
          finalUserMessage = `用户问题：${userMessage}\n（搜索失败，请根据自己的知识回答）`;
          console.log('搜索返回空');
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
