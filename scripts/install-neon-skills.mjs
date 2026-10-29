import fs from 'fs';
import path from 'path';
import https from 'https';

const PROJECT_ROOT = process.cwd();
const HOME = process.env.USERPROFILE || process.env.HOME || '';
const GLOBAL_SKILLS_DIR = path.join(HOME, '.gemini', 'config', 'skills');
const WORKSPACE_SKILLS_DIR = path.join(PROJECT_ROOT, '.agents', 'skills');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MediRem-Skill-Installer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function installSkillFile(skillName, relPath, content) {
  // 1. Workspace
  const wsPath = path.join(WORKSPACE_SKILLS_DIR, skillName, relPath);
  fs.mkdirSync(path.dirname(wsPath), { recursive: true });
  fs.writeFileSync(wsPath, content, 'utf8');

  // 2. Global
  const glPath = path.join(GLOBAL_SKILLS_DIR, skillName, relPath);
  fs.mkdirSync(path.dirname(glPath), { recursive: true });
  fs.writeFileSync(glPath, content, 'utf8');
}

async function main() {
  console.log('Fetching Neon skills registry...');
  const registryJson = await fetchUrl('https://neon.com/.well-known/agent-skills');
  const registry = JSON.parse(registryJson);

  console.log(`Found ${registry.skills.length} skills in Neon registry.`);

  const installedSkills = [];

  for (const item of registry.skills) {
    const skillName = item.name;
    const skillUrl = `https://neon.com${item.url}`;
    console.log(`\n⬇️  Downloading skill [${skillName}] from ${skillUrl}...`);
    try {
      const content = await fetchUrl(skillUrl);
      await installSkillFile(skillName, 'SKILL.md', content);
      installedSkills.push({ name: skillName, description: item.description });
      console.log(`✅ Installed ${skillName}/SKILL.md to workspace and global`);
    } catch (err) {
      console.error(`❌ Failed to download ${skillName}: ${err.message}`);
    }
  }

  // Also fetch key references for neon & neon-auth if available
  const knownReferences = [
    { skill: 'neon', file: 'references/auth.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon/references/auth.md' },
    { skill: 'neon', file: 'references/parse-env.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon/references/parse-env.md' },
    { skill: 'neon', file: 'references/logs-loki.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon/references/logs-loki.md' },
    { skill: 'neon', file: 'references/function-triggers.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon/references/function-triggers.md' },
    { skill: 'neon', file: 'references/claimable-neon.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon/references/claimable-neon.md' },
    { skill: 'neon', file: 'references/sdk.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon/references/sdk.md' },
    { skill: 'neon-auth', file: 'references/managed-auth.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon-auth/references/managed-auth.md' },
    { skill: 'neon-auth', file: 'references/self-managed.md', url: 'https://raw.githubusercontent.com/neondatabase/agent-skills/main/skills/neon-auth/references/self-managed.md' },
  ];

  console.log('\n⬇️  Downloading skill references...');
  for (const ref of knownReferences) {
    try {
      const content = await fetchUrl(ref.url);
      await installSkillFile(ref.skill, ref.file, content);
      console.log(`✅ Installed ${ref.skill}/${ref.file}`);
    } catch (err) {
      console.log(`⚠️ Note: could not fetch ${ref.url} (${err.message})`);
    }
  }

  // Create skills-lock.json in project root
  const lock = {
    version: '1.0.0',
    skills: installedSkills.reduce((acc, s) => {
      acc[s.name] = { version: 'latest', source: 'https://neon.com/.well-known/agent-skills' };
      return acc;
    }, {}),
    installedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(PROJECT_ROOT, 'skills-lock.json'), JSON.stringify(lock, null, 2), 'utf8');
  console.log('\n✅ Created skills-lock.json in project root');

  console.log('\n=============================================');
  console.log('🎉 ALL NEON AGENT SKILLS SUCCESSFULLY INSTALLED!');
  console.log(`Total: ${installedSkills.length} skills`);
  console.log('Workspace location: .agents/skills/');
  console.log('Global location:    ~/.gemini/config/skills/');
  console.log('=============================================');
}

main().catch(console.error);

