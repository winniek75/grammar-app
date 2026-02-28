export const MODE_LABELS: Record<string, string> = {
  choice: '選択問題',
  typing: 'タイピング',
  sorting: '並べ替え'
}

export const GRADE_LABELS: Record<number, string> = {
  1: '中1',
  2: '中2',
  3: '中3'
}

export const GRADE_CATEGORIES: Record<number, string[]> = {
  1: [
    'be動詞',
    '一般動詞（現在形）',
    '疑問文・否定文',
    '複数形・冠詞',
    '命令文・感嘆文',
    '代名詞（人称代名詞）',
    '現在進行形'
  ],
  2: [
    '過去形（規則・不規則）',
    '過去進行形',
    '未来形（will/be going to）',
    '助動詞（can/must/should/may）',
    '不定詞（名詞的・副詞的・形容詞的）',
    '動名詞',
    '接続詞（when/if/because/that）',
    '比較（原級・比較級・最上級）'
  ],
  3: [
    '受動態',
    '現在完了形',
    '不定詞（応用）',
    '関係代名詞（who/which/that）',
    '間接疑問文',
    '分詞（現在分詞・過去分詞）',
    '仮定法（基礎）'
  ]
}