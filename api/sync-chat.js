import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = req.method === 'POST' ? req.body.userId : req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  // 读取聊天记录
  if (req.method === 'GET') {
    try {
      const chatHistory = await kv.get(userId);
      return res.status(200).json({ chatHistory: chatHistory || [] });
    } catch (err) {
      console.error('KV 读取失败:', err);
      return res.status(500).json({ error: 'Read failed' });
    }
  }

  // 保存聊天记录
  if (req.method === 'POST') {
    try {
      const { chatHistory } = req.body;
      if (!chatHistory) {
        return res.status(400).json({ error: 'Missing chatHistory' });
      }
      await kv.set(userId, chatHistory);
      return res.status(200).json({ message: 'OK' });
    } catch (err) {
      console.error('KV 写入失败:', err);
      return res.status(500).json({ error: 'Write failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
