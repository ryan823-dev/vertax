/**
 * CSV 导出通用工具类
 * 
 * 提供将数组对象转换为 CSV 字符串并支持浏览器下载的功能。
 */

export interface CSVColumn<T> {
  header: string;
  key: keyof T | string;
  transform?: (value: unknown, row: T) => string;
}

/**
 * 将数据数组转换为 CSV 字符串
 */
export function generateCSVString<T>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  // 表头
  const headers = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');
  
  // 数据行
  const rows = data.map(row => {
    const rowRecord = row as Record<string, unknown>;
    return columns.map(col => {
      let val: unknown = rowRecord[String(col.key)];
      if (col.transform) {
        val = col.transform(val, row);
      }
      
      const strVal = val === null || val === undefined ? '' : String(val);
      // 转义双引号，处理换行符
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(',');
  });

  // UTF-8 BOM (for Excel)
  return '\ufeff' + [headers, ...rows].join('\n');
}
