import * as fs from "fs";

function main() {
  const logPath = "C:/Users/camil/.gemini/antigravity-ide/brain/e68ac294-d463-4288-bf3a-c1a8e0423569/.system_generated/logs/transcript.jsonl";
  const content = fs.readFileSync(logPath, "utf-8");
  const lines = content.split("\n");

  const targetSteps = [171, 172, 177, 178, 185, 186, 197, 198];

  for (const line of lines) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (targetSteps.includes(obj.step_index)) {
        console.log(`Step ${obj.step_index} (${obj.type}, source=${obj.source}):`);
        console.log(obj.content);
        if (obj.tool_calls) {
          console.log("Tool Calls:", JSON.stringify(obj.tool_calls, null, 2));
        }
        console.log("=========================================");
      }
    } catch (e) {}
  }
}

main();
