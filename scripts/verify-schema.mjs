import { readFile } from "node:fs/promises";
const schema=JSON.parse(await readFile(new URL("../schema/repopack-bundle.schema.json",import.meta.url),"utf8"));
if(schema.$schema!=="https://json-schema.org/draft/2020-12/schema") throw new Error("schema draft mismatch");
if(schema.properties?.schemaVersion?.const!=="1") throw new Error("schemaVersion contract mismatch");
for(const key of ["repository","task","budget","files","bundleHash"]) if(!schema.required.includes(key)) throw new Error(`missing required schema key: ${key}`);
process.stdout.write("Schema verified.\n");
