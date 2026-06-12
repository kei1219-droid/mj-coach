// api/analyze.js
// Vercel Serverless Function
// リプレイURLからゲームIDを抽出 → セガAPIを試行 → Claudeで解析

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// URLからパラメータを抽出
function parseReplayUrl(url) {
  try {
    const u = new URL(url);
    return {
      matchingServerId: u.searchParams.get("matching_server_id"),
      gameId: u.searchParams.get("game_id"),
      targetUserId: u.searchParams.get("target_user_id"),
      kyokuSelect: u.searchParams.get("kyoku_select") || "1",
      shareType: u.searchParams.get("share_type"),
    };
  } catch {
    return null;
  }
}

// セガのリプレイAPIエンドポイントを試行
async function fetchReplayData(params) {
  const candidates = [
    `https://pl.sega-mj.com/mj_viewer/api/replayData?game_id=${params.gameId}&matching_server_id=${params.matchingServerId}&target_user_id=${params.targetUserId}&share_type=${params.shareType}`,
    `https://pl.sega-mj.com/mj_viewer/replayData?game_id=${params.gameId}&matching_server_id=${params.matchingServerId}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          "Referer": "https://pl.sega-mj.com/",
          "Accept": "application/json, text/html, */*",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        return { url, text, status: res.status };
      }
    } catch (_) {
      // 次を試す
    }
  }
  return null;
}

// Claude で牌譜テキスト/JSONを解析
async function analyzeWithClaude(replayInfo, params) {
  const systemPrompt = `あなたはセガNET麻雀MJの牌譜を解析する麻雀AIコーチです。
提供された牌譜情報から各巡目の打牌を解析し、以下のJSON形式のみで返してください（前置き・後置き・マークダウン不要）:

{
  "kyoku": "局情報（例: 東一局0本場）",
  "player": "対象プレイヤー名",
  "turns": [
    {
      "junme": 巡目の数字,
      "hand": "手牌",
      "dahai": "切った牌",
      "evaluation": "好手/普通/疑問手/悪手",
      "reason": "理由（100字）",
      "score": 0から100
    }
  ],
  "summary": "この局の総評（150字）",
  "total_score": 0から100
}

情報が限られている場合も最大限推定して出力してください。`;

  const userContent = replayInfo
    ? `以下のリプレイデータを解析してください。\nゲームID: ${params.gameId}\nサーバーID: ${params.matchingServerId}\n対象ユーザーID: ${params.targetUserId}\n局選択: ${params.kyokuSelect}\n\n取得データ:\n${replayInfo.text.slice(0, 3000)}`
    : `以下のリプレイURLのパラメータから推定できる範囲で解析の枠組みを作成し、データが取得できなかった旨を含めて返してください。\nゲームID: ${params.gameId}\nサーバーID: ${params.matchingServerId}\n対象ユーザーID: ${params.targetUserId}\n局選択: ${params.kyokuSelect}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const text = message.content.map((b) => b.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URLが必要です" });

    const params = parseReplayUrl(url);
    if (!params || !params.gameId) {
      return res.status(400).json({ error: "有効なmjモバイルのリプレイURLを入力してください" });
    }

    // セガAPIからデータ取得を試みる
    const replayData = await fetchReplayData(params);

    // Claudeで解析
    const analysis = await analyzeWithClaude(replayData, params);

    return res.status(200).json({
      success: true,
      dataFetched: !!replayData,
      params,
      analysis,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "解析中にエラーが発生しました" });
  }
};
