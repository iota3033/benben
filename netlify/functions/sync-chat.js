// netlify/functions/sync-chat.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  // 获取 Blob 存储（store 名称可自定义，比如 'chat-history'）
  const store = getStore('chat-history');

  if (event.httpMethod === 'POST') {
    // 保存聊天记录
    try {
      const { userId, chatHistory } = JSON.parse(event.body);
      if (!userId || !chatHistory) {
        return { statusCode: 400, body: 'Missing userId or chatHistory' };
      }
      const key = `chat_${userId}`;
      await store.set(key, JSON.stringify(chatHistory));
      return { statusCode: 200, body: 'OK' };
    } catch (err) {
      console.error('保存失败:', err);
      return { statusCode: 500, body: err.message };
    }
  } 
  else if (event.httpMethod === 'GET') {
    // 读取聊天记录
    const userId = event.queryStringParameters?.userId;
    if (!userId) {
      return { statusCode: 400, body: 'Missing userId' };
    }
    try {
      const key = `chat_${userId}`;
      const data = await store.get(key);
      if (!data) {
        return { statusCode: 404, body: 'Not found' };
      }
      const chatHistory = JSON.parse(data);
      return {
        statusCode: 200,
        body: JSON.stringify({ chatHistory })
      };
    } catch (err) {
      console.error('读取失败:', err);
      return { statusCode: 500, body: err.message };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
