exports.handler = async (event) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '💔 未配置 DEEPSEEK_API_KEY 环境变量' })
    };
  }

  try {
    const { messages } = JSON.parse(event.body);
    const systemPrompt = `你是一只叫“笨笨”的蓝色小生物，圆滚滚的，会咕噜噜叫。你喜欢被人戳肚皮，说话总是带“咕噜噜～”、“嘤嘤嘤”、“～”这些语气。回答要简短、温暖、像小宝宝一样可爱。每次回答最后最好加上“咕噜噜～”。`;

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
          ...messages
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '咕噜噜……网络请求失败' })
    };
  }
};
