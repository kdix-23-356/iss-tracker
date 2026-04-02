/**
 * format.ts
 *
 * 目的:
 *  - 日時などのフォーマット処理をまとめた純粋なユーティリティ関数群。
 *  - 表示上の揺れを防ぐため、アプリ全体で統一したフォーマットを提供する。
 */

/**
 * 数値を2桁のゼロ埋め文字列に変換するヘルパー関数
 * @param n 数値
 * @returns 2桁のゼロ埋め文字列
 */
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 時分秒をフォーマットする (HH:mm:ss)
 * @param date Dateオブジェクト、または epoch ms
 * @returns フォーマット済みの時刻文字列
 */
export function formatTimeHMS(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 日時をフォーマットする (YYYY-MM-DD HH:mm:ss)
 * @param ms epoch ms
 * @returns フォーマット済みの日時文字列
 */
export function formatDateTimeMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${formatTimeHMS(d)}`;
}