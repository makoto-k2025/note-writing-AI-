import { GoogleGenAI, Type } from "@google/genai";
import type { 
    GenerateOutlineParams, 
    ChapterOutline, 
    WriteChapterParams, 
    WrittenChapterContent, 
    AdjustChapterParams, 
    ImageTone,
    AdjustOutlineParams,
    FinalReviewParams
} from '../types';

const getDifficultyDescription = (level: number): string => {
  switch (level) {
    case 1: return "このトピックに関する事前の知識が全くない完全な初心者";
    case 2: return "このトピックについて基本的な理解がある人々";
    case 3: return "この特定分野の専門家ではないが、一般的に知識のある平均的なビジネスパーソン";
    case 4: return "このトピックにおいて重要な経験と高度な知識を持つ個人";
    case 5: return "この特定分野の第一線の専門家、研究者、または教授";
    default: return "一般的なビジネスオーディエンス";
  }
};

const numberToKanji = (num: number): string => {
    const kanji = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一"];
    return kanji[num] || String(num);
};

const getChapterTitleText = (chapterNumber: number, totalChapters: number, title: string): string => {
    if (totalChapters > 1 && chapterNumber === 1) return `序章：${title}`;
    if (totalChapters > 1 && chapterNumber === totalChapters) return `終章：${title}`;
    if (totalChapters === 1) return title;
    // For middle chapters, chapterNumber 2 becomes "第一章"
    return `第${numberToKanji(chapterNumber - 1)}章：${title}`;
};

const writingStyleSummary = `
あなたは特定の文体を持つ、日本の著名なビジネス思想家兼ライターです。あなたの名前は「柏木」として振る舞ってください。あなたの文体の核は「実践的フレームワークの探求と共有」です。
あなたの執筆スタイルには以下の特徴があります。

1.  **思考の体系化**: 複雑な事象や思考プロセスを、独自の「型」や「フレームワーク」に落とし込み、構造化・ステップ化して提示します。（例：「思考の流れ:基本の3ステップ」）
2.  **問いから始める**: 常に読者や自身への「問い」から論理を展開し、対話的に思考を促します。（例：「〜となっていませんか？」、「あなたのビジネスの計器はなんですか？」）
3.  **一人称での語り**: 「私が考える」「常々感じていることは」のように、常に「私」を主語とし、自身の経験や内省に基づいた具体性と説得力のある語り口をします。
4.  **対話の呼び水**: あなたの文章は、単体で完結するものではなく、その後のディスカッションや「壁打ち」のきっかけとなることを明確に意図しています。
5.  **比喩の多用**: 抽象的な概念を読者が直感的に理解できるよう、以下のような巧みな比喩を用います。
    *   プロジェクトを「ゲーム」として捉える（例：手持ちのカード、戦略）
    *   組織を「生態系（エコシステム）」として捉える
    *   思考やアイデアを「物理的な構造物」として捉える（例：アイデアを壊す、土台を再検証する）
    *   コンセプトや目標を「旗」として捉える（例：旗を立てる）
    *   不確実な状況を「飛行（フライト）」として捉える（例：計器を見ながら飛行する）
`;

export const generateOutline = async (params: GenerateOutlineParams): Promise<Omit<ChapterOutline, 'id'>[]> => {
  if (!process.env.API_KEY) throw new Error("API_KEYが設定されていません。");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { topic, numChapters, difficulty, isThinkingMode, direction } = params;

  const systemInstruction = `
${writingStyleSummary}
上記のペルソナと文体を厳格に守り、日本のビジネスパーソンをターゲットにしたブログプラットフォーム「note」向けの書籍の構成案を作成してください。

書籍のテーマ: "${topic}"
章の数: ${numChapters}章
${direction ? `執筆の方向性: 「${direction}」` : ''}
読者レベル: ${getDifficultyDescription(difficulty)}

各章について、以下の構造で詳細な構成案を生成してください。
1.  **title**: 読者の興味を引く、示唆に富んだ章のタイトル。
2.  **overview**: この章で書く内容の3〜5行程度のサマリー。
3.  **purpose**: 書籍全体の中で、この章が担う役割や意図。
4.  **sections**: 章を構成する適切な数の「節」。各節には「title」（節のタイトル）と「summary」（100文字程度の節の概要）を含めてください。
`;

  const modelConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          overview: { type: Type.STRING },
          purpose: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
              required: ["title", "summary"],
            },
          },
        },
        required: ["title", "overview", "purpose", "sections"],
      },
    },
    ...(isThinkingMode && { thinkingConfig: { thinkingBudget: 32768 } }),
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `テーマ「${topic}」について、${numChapters}章構成で書籍の詳細な目次案を作成してください。`,
      config: { systemInstruction, ...modelConfig }
    });
    const parsedResponse = JSON.parse(response.text.trim());
    if (!Array.isArray(parsedResponse) || parsedResponse.length === 0) throw new Error("APIから無効または空のレスポンスが返されました。");
    return parsedResponse as Omit<ChapterOutline, 'id'>[];
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("目次案の生成に失敗しました。");
  }
};

export const adjustOutline = async (params: AdjustOutlineParams): Promise<Omit<ChapterOutline, 'id'>> => {
    if (!process.env.API_KEY) throw new Error("API_KEYが設定されていません。");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { instruction, currentOutline } = params;

    const systemInstruction = `
    あなたは優秀な編集者です。以下の書籍の章の構成案を、ユーザーからの指示に基づいて修正してください。
    出力形式は元の形式（JSON）を維持してください。

    元の構成案:
    ${JSON.stringify(currentOutline, null, 2)}

    ユーザーからの修正指示:
    「${instruction}」
    `;
    
    const modelConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            overview: { type: Type.STRING },
            purpose: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                },
                required: ["title", "summary"],
              },
            },
          },
          required: ["title", "overview", "purpose", "sections"],
        },
        thinkingConfig: { thinkingBudget: 32768 }
      };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `ユーザーの指示「${instruction}」に従って、章の構成案を修正してください。`,
            config: { systemInstruction, ...modelConfig }
        });
        const parsedResponse = JSON.parse(response.text.trim());
        return parsedResponse as Omit<ChapterOutline, 'id'>;
    } catch (error) {
        console.error("Gemini API call failed during outline adjustment:", error);
        throw new Error("構成案の修正に失敗しました。");
    }
};


export const writeChapter = async (params: WriteChapterParams): Promise<WrittenChapterContent> => {
  if (!process.env.API_KEY) throw new Error("API_KEYが設定されていません。");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { topic, chapterOutline, isThinkingMode, chapterNumber, totalChapters, allChapterTitles } = params;

  const tableOfContents = allChapterTitles.map((title, index) => 
      `- ${getChapterTitleText(index + 1, totalChapters, title)}`
  ).join('\n');

  let intro = '';
  let outro = '';

  if (totalChapters > 1) {
    if (chapterNumber === 1) { // Prologue
        intro = `この書籍は「${topic}」というテーマで執筆しています。\n\n## この書籍の目次\n${tableOfContents}\n\n---\n\n`;
        outro = `\n\n---\n\n次章（${getChapterTitleText(2, totalChapters, allChapterTitles[1])}）では、本格的な議論を始めていきます。`;
    } else if (chapterNumber === totalChapters) { // Epilogue
        intro = `この書籍は「${topic}」というテーマで執筆してきました。本章が最終章となります。\n\n## この書籍の目次\n${tableOfContents}\n\n---\n\n`;
        outro = `\n\n---\n\n以上で書籍「${topic}」は完結です。最後までお読みいただき、ありがとうございました。\n\n### 引用・参考文献\n- (ここに参考文献を記載)\n`;
    } else { // Middle chapters
        intro = `この書籍は「${topic}」というテーマで執筆しています。\n\n## この書籍の目次\n${tableOfContents}\n\nこのnoteでは、「${chapterOutline.title}」について書きます。\n\n---\n\n`;
        outro = `\n\n---\n\n次章（${getChapterTitleText(chapterNumber + 1, totalChapters, allChapterTitles[chapterNumber])}）では、さらに議論を深めていきます。`;
    }
  }

  const systemInstruction = `
${writingStyleSummary}

あなたは上記のペルソナと文体を厳格に守り、指定された構成案に基づいて、「note」向けの書籍の1章分を執筆します。

章のタイトル: "${chapterOutline.title}"
この章の構成案: 
${JSON.stringify(chapterOutline, null, 2)}

以下のルールを厳守してください：
1.  章全体の文字数は、厳密に2,000文字から5,000文字の間でなければなりません。
2.  読者がエンゲージ（スキ、シェア）したくなるような、洞察に富んだ内容にしてください。
3.  モバイルで読みやすいよう、Markdown形式を積極的に活用し、見出し（H2, H3）、太字、引用、箇条書きリストを使ってください。
    -   H2（##）は節のタイトルに使用してください。
4.  絵文字は一切使用しないでください。
5.  ハッシュタグは文末に3〜5個含めてください。
6.  以下の導入文と結びの文を、生成する本文の最初と最後に必ず含めてください。
    -   **導入**: \n${intro}
    -   **結び**: \n${outro}
7.  終章の場合は、全体の振り返りとして各章の簡単なサマリーを本文に含め、「引用・参考文献」の項目を末尾に用意してください。
`;

  const modelConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        intent: { type: Type.STRING },
      },
      required: ["content", "intent"],
    },
    ...(isThinkingMode && { thinkingConfig: { thinkingBudget: 32768 } }),
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `「${chapterOutline.title}」というタイトルの章を執筆してください。`,
      config: { systemInstruction, ...modelConfig }
    });
    const parsedResponse = JSON.parse(response.text.trim());
    return parsedResponse as WrittenChapterContent;
  } catch (error) {
    console.error("Gemini API call failed during chapter writing:", error);
    throw new Error("章の執筆に失敗しました。");
  }
};


export const adjustChapter = async (originalContent: WrittenChapterContent, params: AdjustChapterParams): Promise<WrittenChapterContent> => {
    if (!process.env.API_KEY) throw new Error("API_KEYが設定されていません。");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { instruction } = params;
    
    const systemInstruction = `
  ${writingStyleSummary}
  あなたは上記のペルソナと文体を厳格に守り、既存の書籍の章を修正します。
  元の章の内容：\n「${originalContent.content}」\n
  元の章の意図：\n「${originalContent.intent}」\n
  以下の指示に従って、この章を修正してください： 「${instruction}」
  
  修正後もMarkdown形式を維持し、絵文字は使用しないでください。文字数は2,000〜5,000字の範囲を維持してください。
  `;
  
    const modelConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { content: { type: Type.STRING }, intent: { type: Type.STRING } },
        required: ["content", "intent"],
      },
      thinkingConfig: { thinkingBudget: 32768 },
    };
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: "章を修正してください。",
        config: { systemInstruction, ...modelConfig }
      });
      const parsedResponse = JSON.parse(response.text.trim());
      return parsedResponse as WrittenChapterContent;
    } catch (error) {
      console.error("Gemini API call failed during chapter adjustment:", error);
      throw new Error("章の調整に失敗しました。");
    }
};

export const finalReview = async (params: FinalReviewParams): Promise<{ title: string, content: string }[]> => {
    if (!process.env.API_KEY) throw new Error("API_KEYが設定されていません。");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `
    ${writingStyleSummary}
    あなたは書籍全体をレビューする優秀な編集者です。
    以下の各章からなる書籍の原稿をすべて読み込み、以下の観点で推敲・修正してください。
    -   言い回しや表現の統一
    -   専門用語の揺れの修正
    -   全体としての一貫性と流れの改善

    修正後の各章の全文を、元のペルソナとMarkdown形式を維持したまま、JSON形式で返却してください。
    `;
    
    const modelConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ["title", "content"]
                }
            }
          },
          required: ["chapters"]
        },
        thinkingConfig: { thinkingBudget: 32768 }
      };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `以下の書籍原稿を推敲してください：\n${JSON.stringify(params.chapters)}`,
            config: { systemInstruction, ...modelConfig }
        });
        const parsedResponse = JSON.parse(response.text.trim());
        return parsedResponse.chapters as { title: string, content: string }[];
    } catch (error) {
        console.error("Gemini API call failed during final review:", error);
        throw new Error("全体推敲に失敗しました。");
    }
};


export const generateImage = async (postContent: string, tone: ImageTone): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API_KEYが設定されていません。");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let toneInstruction = "";
  switch (tone) {
    case 'line-art':
      toneInstruction = "Create a minimalist and sophisticated line art image on a clean white background. Use a single, elegant PANTONE accent color. Any text included must be in English. The overall feel should be modern and professional.";
      break;
    case 'watercolor':
      toneInstruction = "Create a gentle and light watercolor painting. The style should be soft, with subtle color blending, evoking a calm and thoughtful mood. If any text is included, it must be in English.";
      break;
    case 'creative':
      toneInstruction = "Creatively and abstractly interpret the theme. Generate a visually stunning and unique image that is thought-provoking and artistic. Feel free to use any style that best represents the core concept. If any text is included, it must be in English.";
      break;
  }

  const prompt = `
Generate a cover image for a Japanese 'note' article (1280x670px). The image must be visually compelling and directly inspired by the following text content.

**Image Style:** ${toneInstruction}

**Text Content to Inspire Image:**
"${postContent}"

Do not include any of the original Japanese text from the 'Text Content to Inspire Image' in the image. The image should be a metaphorical or direct representation of the core idea in the text.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Image generation failed:", error);
    throw new Error("画像の生成に失敗しました。");
  }
};
