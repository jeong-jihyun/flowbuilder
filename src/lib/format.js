// 날짜·시간을 한국식 짧은 모양으로 (예: 26. 11. 16. 오후 8:30)
export function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}
