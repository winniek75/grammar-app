// 学年ごとのカテゴリ定義（フィルター用）
export const GRADE_CATEGORIES: Record<number, string[]> = {
  1: [
    'be動詞',
    '一般動詞',
    '疑問文・否定文',
    '複数形・冠詞',
    '命令文・感嘆文',
    '代名詞',
    '現在進行形',
  ],
  2: [
    '過去形',
    '過去進行形',
    '未来形',
    '助動詞',
    '不定詞',
    '動名詞',
    '接続詞',
    '比較',
  ],
  3: [
    '受動態',
    '現在完了形',
    '不定詞（応用）',
    '関係代名詞',
    '間接疑問文',
    '分詞',
    '仮定法',
  ],
}

export const ALL_CATEGORIES = [
  ...GRADE_CATEGORIES[1],
  ...GRADE_CATEGORIES[2],
  ...GRADE_CATEGORIES[3],
]

export const GRADE_LABELS: Record<number, string> = {
  1: '中1',
  2: '中2',
  3: '中3',
}

export const MODE_LABELS: Record<string, string> = {
  choice: '4択選択',
  typing: 'タイピング',
  sorting: '並べ替え',
}
