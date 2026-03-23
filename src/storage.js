import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ensureDir, writeJson } from "./fs-util.js";
import { getSummary, getCsvHeaders, authorToCsvRow } from "./parser.js";

let XLSX = null;
try {
  XLSX = require("xlsx");
} catch {}

// 居中样式
const centerStyle = {
  alignment: { horizontal: "center", vertical: "center" },
  font: { name: "Arial", sz: 10 },
  border: {
    top: { style: "thin", color: { rgb: "D3D3D3" } },
    bottom: { style: "thin", color: { rgb: "D3D3D3" } },
    left: { style: "thin", color: { rgb: "D3D3D3" } },
    right: { style: "thin", color: { rgb: "D3D3D3" } }
  }
};

const headerStyle = {
  ...centerStyle,
  font: { name: "Arial", sz: 10, bold: true },
  fill: { fgColor: { rgb: "E8E8E8" } }
};

export function saveAuthors(authors, cfg, searchInfo) {
  const outDir = path.resolve(process.cwd(), cfg.outputDir);
  ensureDir(outDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeKeyword = (searchInfo.keyword || searchInfo.authorId || "unknown").replace(/[^\w\u4e00-\u9fa5]/g, "_");
  
  const summary = getSummary(authors);

  const jsonFileName = `xingtu-${safeKeyword}-${timestamp}.json`;
  const jsonFilePath = path.join(outDir, jsonFileName);
  const jsonOutput = {
    meta: {
      keyword: searchInfo.keyword || null,
      authorId: searchInfo.authorId || null,
      searchMode: searchInfo.searchMode,
      exportedAt: new Date().toISOString(),
      totalCount: authors.length,
      summary: summary
    },
    authors: authors
  };
  writeJson(jsonFilePath, jsonOutput);

  const csvFileName = `xingtu-${safeKeyword}-${timestamp}.csv`;
  const csvFilePath = path.join(outDir, csvFileName);
  saveCsvFile(csvFilePath, authors);

  console.log(`\n数据导出完成:`);
  console.log(`  JSON: ${jsonFilePath}`);
  console.log(`  CSV:  ${csvFilePath}`);
  console.log(`  总数: ${authors.length} 条达人`);
  console.log(`  有报价: ${summary.with_prices} 条`);
  console.log(`  有橱窗: ${summary.with_ecommerce} 条`);

  return { jsonFilePath, csvFilePath };
}

export function saveCsvFile(filePath, authors) {
  const headers = getCsvHeaders();
  const rows = authors.map(author => authorToCsvRow(author));

  // 保存 CSV
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => escapeCsvCell(String(cell))).join(","))
  ].join("\n");

  fs.writeFileSync(filePath, "\uFEFF" + csvContent, "utf8");

  // 保存 Excel
  if (XLSX) {
    const xlsxPath = filePath.replace(/\.csv$/, ".xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // 设置列宽
    const colWidths = headers.map(() => ({ wch: 15 }));
    ws["!cols"] = colWidths;

    // 应用居中样式
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = R === 0 ? headerStyle : centerStyle;
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "达人数据");
    XLSX.writeFile(wb, xlsxPath);
  }
}

function escapeCsvCell(cell) {
  if (cell.includes(",") || cell.includes("\"") || cell.includes("\n") || cell.includes("\r")) {
    return `"${cell.replace(/"/g, "\"\"")}"`;
  }
  return cell;
}

export function saveAuthorsToCsv(filePath, authors) {
  saveCsvFile(filePath, authors);
}

export function saveAuthorsToJson(filePath, authors, meta = {}) {
  const output = {
    meta: {
      ...meta,
      exportedAt: new Date().toISOString(),
      totalCount: authors.length
    },
    authors: authors
  };
  writeJson(filePath, output);
}

export function saveRawResponse(jsonResponses, cfg) {
  const outDir = path.resolve(process.cwd(), cfg.outputDir, "raw");
  ensureDir(outDir);

  const timestamp = Date.now();
  const filePath = path.join(outDir, `raw-response-${timestamp}.json`);

  writeJson(filePath, jsonResponses);

  return filePath;
}

export function saveBatchResults(results, cfg) {
  const outDir = path.resolve(process.cwd(), cfg.outputDir);
  ensureDir(outDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const allAuthors = [];
  const allCsvRows = [getCsvHeaders()];

  for (const result of results) {
    if (result.authors && result.authors.length > 0) {
      allAuthors.push(...result.authors);
      for (const author of result.authors) {
        allCsvRows.push(authorToCsvRow(author).map(cell => escapeCsvCell(String(cell))).join(","));
      }
    }
  }

  const summary = getSummary(allAuthors);

  const jsonFilePath = path.join(outDir, `xingtu-batch-${timestamp}.json`);
  const jsonOutput = {
    meta: {
      exportedAt: new Date().toISOString(),
      totalKeywords: results.length,
      successfulKeywords: results.filter(r => r.success).length,
      totalAuthors: allAuthors.length,
      summary: summary
    },
    keywords: results.map(r => ({
      keyword: r.keyword,
      success: r.success,
      authorCount: r.authors?.length || 0,
      error: r.error || null
    })),
    authors: allAuthors
  };
  writeJson(jsonFilePath, jsonOutput);

  const csvFilePath = path.join(outDir, `xingtu-batch-${timestamp}.csv`);
  fs.writeFileSync(csvFilePath, "\uFEFF" + allCsvRows.join("\n"), "utf8");

  if (XLSX) {
    const xlsxPath = path.join(outDir, `xingtu-batch-${timestamp}.xlsx`);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(allCsvRows);

    const colWidths = getCsvHeaders().map(() => ({ wch: 15 }));
    ws["!cols"] = colWidths;

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = R === 0 ? headerStyle : centerStyle;
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "达人数据");
    XLSX.writeFile(wb, xlsxPath);
  }

  console.log(`\n批量数据导出完成:`);
  console.log(`  JSON: ${jsonFilePath}`);
  console.log(`  CSV:  ${csvFilePath}`);
  console.log(`  关键词数: ${results.length}`);
  console.log(`  成功: ${results.filter(r => r.success).length}`);
  console.log(`  总达人: ${allAuthors.length} 条`);

  return { jsonFilePath, csvFilePath };
}

export function loadAuthorsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    if (data.authors && Array.isArray(data.authors)) {
      return data;
    }
    if (Array.isArray(data)) {
      return { authors: data, meta: {} };
    }
    throw new Error("文件格式不正确");
  } catch (e) {
    throw new Error(`读取文件失败: ${e.message}`);
  }
}

export function listOutputFiles(cfg) {
  const outDir = path.resolve(process.cwd(), cfg.outputDir);
  if (!fs.existsSync(outDir)) {
    return [];
  }

  const files = fs.readdirSync(outDir)
    .filter(f => f.endsWith(".json") || f.endsWith(".csv"))
    .map(f => path.join(outDir, f))
    .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);

  return files;
}
