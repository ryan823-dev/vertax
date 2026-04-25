import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type Pattern = {
  label: string;
  pattern: RegExp;
  severity: "legacy" | "layout" | "ornament" | "review";
};

const roots = [
  "src/app/customer",
  "src/components/customer",
  "src/components/ui",
];

const patterns: Pattern[] = [
  {
    label: "legacy cockpit semantics",
    pattern: /\bcockpit\b|cockpit-container|btn-cockpit|input-cockpit/i,
    severity: "legacy",
  },
  {
    label: "legacy executive semantics",
    pattern: /\bexecutive\b|CEOCockpit|ExecutiveAssistant/i,
    severity: "legacy",
  },
  {
    label: "gold or premium UI semantics",
    pattern: /\bgold\b|btn-gold|badge-gold|premium/i,
    severity: "legacy",
  },
  {
    label: "large rounded containers",
    pattern: /rounded-\[?(?:2xl|3xl|24px|28px|32px)\]?/i,
    severity: "layout",
  },
  {
    label: "heavy shadows",
    pattern: /shadow-(?:2xl|\[0_?8px|\[0_?18px|\[0_?20px|\[0_?24px|\[0_?30px)/i,
    severity: "ornament",
  },
  {
    label: "decorative gradients",
    pattern: /bg-gradient|linear-gradient|radial-gradient/i,
    severity: "ornament",
  },
  {
    label: "card component or card language",
    pattern: /\bCard\b|card-/,
    severity: "review",
  },
];

const allowedExtensions = new Set([".ts", ".tsx", ".css"]);

function extensionOf(path: string) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function collectFiles(root: string): string[] {
  if (!existsSync(root)) return [];

  const files: string[] = [];
  const entries = readdirSync(root);

  for (const entry of entries) {
    const path = join(root, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...collectFiles(path));
      continue;
    }

    if (stats.isFile() && allowedExtensions.has(extensionOf(path))) {
      files.push(path);
    }
  }

  return files;
}

const files = roots.flatMap(collectFiles);
const results = patterns.map((pattern) => ({
  ...pattern,
  count: 0,
  files: new Map<string, number>(),
}));

for (const file of files) {
  const text = readFileSync(file, "utf8");

  for (const result of results) {
    const flags = result.pattern.flags.includes("g")
      ? result.pattern.flags
      : `${result.pattern.flags}g`;
    const matcher = new RegExp(result.pattern.source, flags);
    const matches = text.match(matcher);
    if (!matches) continue;

    result.count += matches.length;
    result.files.set(file, matches.length);
  }
}

console.log("VertaX customer UI audit");
console.log(`Scanned ${files.length} files across ${roots.join(", ")}`);
console.log("");

for (const result of results) {
  const topFiles = [...result.files.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, count]) => `${relative(process.cwd(), file)} (${count})`);

  console.log(
    `${result.count.toString().padStart(4, " ")}  ${result.severity.padEnd(8, " ")}  ${result.label}`,
  );
  if (topFiles.length > 0) {
    console.log(`      ${topFiles.join(", ")}`);
  }
}

console.log("");
console.log(
  "Use this as a fixed review map, not an automatic pass/fail gate. For each UI checkpoint, compare the counts and screenshots before deciding whether the surface became calmer and more operational.",
);
