// 极简调试版：直接返回博查 API 的原始响应
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, role } = req.body;
    const userMessage = messages[messages.length - 1]?.content || "";

    // 只处理主人模式且包含“搜索”的消息
    if (role !== 'master' || !userMessage.includes('搜索')) {
      return res.status(200).json({
        choices: [{ message: { content: "调试模式：未触发。请用主人模式发送包含“搜索”的消息。" } }]
      });
    }

    const bochaKey = process.env.BOCHA_API_KEY;
    if (!bochaKey) {
      return res.status(200).json({
        choices: [{ message: { content: "调试信息：环境变量 BOCHA_API_KEY 未配置" } }]
      });
    }

    const query = userMessage.replace(/搜索/g, '').trim() || '新闻';
    const url = 'https://api.bochaai.com/v1/web-search';

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bochaKey}`
        },
        body: JSON.stringify({ query, max_results: 3 })
      });
    } catch (err) {
      return res.status(200).json({
        choices: [{ message: { content: `请求发送失败: ${err.message}` } }]
      });
    }

    const status = response.status;
    let rawBody;
    try {
      const data = await response.json();
      rawBody = JSON.stringify(data, null, 2);
    } catch (err) {
      rawBody = await response.text();
    }

    const debugOutput = `HTTP ${status}\n\n${rawBody}`;
    return res.status(200).json({
      choices: [{ message: { content: debugOutput } }]
    });
  } catch (err) {
    return res.status(200).json({
      choices: [{ message: { content: `执行出错: ${err.message}` } }]
    });
  }
}
