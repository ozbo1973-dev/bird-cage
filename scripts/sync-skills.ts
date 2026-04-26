import { cp, copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const SOURCE_SKILLS_ROOT = String.raw`C:\Users\Owner\Documents\coding projects\ai-skills-agents\.claude\skills`;
const DESTINATION_SKILLS_ROOT = path.resolve(
  process.cwd(),
  ".claude",
  "skills",
);

const SKILLS_TO_COPY = [
  "caveman",
  "grill-me",
  "to-prd",
  "to-issues",
  "tdd",
  "improve-codebase-architecture",
  "git-ai-issue-start",
  "triage-issue",
];

function assertSafeSkillName(skill: string) {
  if (!skill.trim()) {
    throw new Error("Skill entry cannot be empty");
  }

  if (path.isAbsolute(skill)) {
    throw new Error(`Skill entry cannot be an absolute path: ${skill}`);
  }

  const segments = skill.replace(/\\/g, "/").split("/");
  if (segments.includes("..")) {
    throw new Error(`Skill entry cannot include '..': ${skill}`);
  }
}

async function copySkill(skill: string) {
  assertSafeSkillName(skill);

  const sourcePath = path.resolve(SOURCE_SKILLS_ROOT, skill);
  const destinationPath = path.resolve(DESTINATION_SKILLS_ROOT, skill);

  let sourceStats;
  try {
    sourceStats = await stat(sourcePath);
  } catch {
    return { status: "missing" as const, skill };
  }

  try {
    if (sourceStats.isDirectory()) {
      await cp(sourcePath, destinationPath, { recursive: true, force: true });
    } else {
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await copyFile(sourcePath, destinationPath);
    }

    return { status: "copied" as const, skill };
  } catch (error) {
    return { status: "failed" as const, skill, error };
  }
}

async function main() {
  console.log(`Source: ${SOURCE_SKILLS_ROOT}`);
  console.log(`Destination: ${DESTINATION_SKILLS_ROOT}`);

  await mkdir(DESTINATION_SKILLS_ROOT, { recursive: true });

  let copied = 0;
  let missing = 0;
  let failed = 0;

  for (const skill of SKILLS_TO_COPY) {
    const result = await copySkill(skill);

    if (result.status === "copied") {
      copied += 1;
      console.log(`Copied: ${result.skill}`);
      continue;
    }

    if (result.status === "missing") {
      missing += 1;
      console.warn(`Missing source skill, skipped: ${result.skill}`);
      continue;
    }

    failed += 1;
    const message =
      result.error instanceof Error
        ? result.error.message
        : String(result.error);
    console.error(`Failed to copy ${result.skill}: ${message}`);
  }

  console.log(
    `Summary -> copied: ${copied}, missing: ${missing}, failed: ${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Skill sync failed:", error);
  process.exitCode = 1;
});
