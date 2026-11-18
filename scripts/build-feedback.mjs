import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

await build({
  stdin: { contents: 'export { offlineCoach } from "./src/lib/coaching";', resolveDir: process.cwd(), loader: "ts" },
  outfile: "supabase/functions/feedback/coach.generated.ts", bundle: true, platform: "neutral", format: "esm", target: "es2022", treeShaking: true,
  external: ["npm:*"],
  plugins: [{ name: "edge-spelling", setup(builder) {
    builder.onLoad({ filter: /src\/lib\/spell\.ts$/ }, async ({ path }) => {
      const source = await readFile(path, "utf8");
      const allow = source.slice(source.indexOf("const ALLOW"), source.indexOf("function dictionaryDir"));
      const functions = source.slice(source.indexOf("export function spellReady"));
      return { loader: "ts", resolveDir: resolve("src/lib"), contents: `import nspell from "npm:nspell@2.1.5";\nimport dictionary from "npm:dictionary-en@4.0.0";\nlet speller;\n${allow}\nfunction init(){ if(!speller)speller=nspell(dictionary); return speller; }\n${functions}` };
    });
  } }],
});
console.log("Built the existing WriteGrow coach for Supabase Edge Functions.");
