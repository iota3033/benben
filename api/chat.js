// api/chat.js - 基于调试版成功逻辑的最终稳定版
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
      console.log('未配置 BOCHA_API_KEY');
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
      console.log('博查返回结构:', Object.keys(data));
      // 调试版显示 data.results 存在，直接取
      const results = data.results;
      if (!results || results.length === 0) {
        console.log('无结果');
        return null;
      }
      let context = '搜索结果：\n';
      for (let i = 0; i < Math.min(3, results.length); i++) {
        const item = results[i];
        context += `${i+1}. ${item.title || '无标题'}\n   ${item.snippet || '无摘要'}\n   链接: ${item.url || '#'}\n\n`;
      }
      return context;
    } catch (err) {
      console.log('搜索异常:', err.message);
      return null;
    }
  }

  try {
    const { messages, role } = req.body;
    let userMsg = messages[messages.length-1]?.content || '';
    let finalUserMsg = userMsg;

    if (role === 'master' && /搜索|新闻|今天|最新|实时|天气|热点/.test(userMsg)) {
      console.log('触发搜索:', userMsg);
      const searchResult = await searchBocha(userMsg);
      if (searchResult) {
        finalUserMsg = `用户问题：${userMsg}\n\n${searchResult}\n请根据上述搜索结果回答。`;
        console.log('搜索结果已注入');
      } else {
        finalUserMsg = `用户问题：${userMsg}\n（搜索未返回结果）`;
        console.log('搜索无结果');
      }
    }

    const newMessages = [...messages];
    newMessages[newMessages.length-1] = { role: 'user', content: finalUserMsg };

    // 极简系统提示词
    const systemPrompt = role === 'master'
      ? '你是笨笨，蓝色小虎鲸。回答温暖简短，带嘤嘤嘤和咕噜噜。'
      : '你是笨笨，回答简短可爱。';

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...newMessages],
        temperature: 0.7,
        max_tokens: 600
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('总异常:', err);
    return res.status(500).json({ error: err.message });
  }
}
