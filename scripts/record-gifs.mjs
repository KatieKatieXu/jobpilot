import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

const OUTPUT_DIR = '/Users/katiexu/katexu-website/public';
const VIDEOS_DIR = '/Users/katiexu/jobpilot/screenshots/videos';

// Ensure directories exist
if (!existsSync(VIDEOS_DIR)) mkdirSync(VIDEOS_DIR, { recursive: true });

async function recordAndConvert(name, url, actions, options = {}) {
  const { width = 1200, height = 700, duration = 5000 } = options;
  
  console.log(`\n📹 Recording ${name}...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: VIDEOS_DIR, size: { width, height } }
  });
  
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // Execute custom actions
  if (actions) {
    await actions(page);
  } else {
    await page.waitForTimeout(duration);
  }
  
  await page.waitForTimeout(500);
  await page.close();
  await context.close();
  await browser.close();
  
  // Find the video file
  const videoPath = `${VIDEOS_DIR}/${name}.webm`;
  const gifPath = `${OUTPUT_DIR}/jobpilot-${name}.gif`;
  
  // Get the latest video file
  const files = execSync(`ls -t ${VIDEOS_DIR}/*.webm 2>/dev/null || true`).toString().trim().split('\n');
  if (files[0]) {
    execSync(`mv "${files[0]}" "${videoPath}"`);
    
    // Convert to GIF with good quality and smaller size
    console.log(`🎬 Converting ${name} to GIF...`);
    execSync(`ffmpeg -y -i "${videoPath}" -vf "fps=12,scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${gifPath}"`);
    
    console.log(`✅ Created ${gifPath}`);
  }
}

async function main() {
  const BASE_URL = 'http://localhost:3001';
  
  // 1. Resume Reviser - show the upload and analysis flow
  await recordAndConvert('resume', `${BASE_URL}/resume`, async (page) => {
    await page.waitForTimeout(1000);
    // Scroll down slowly to show content
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);
  });
  
  // 2. Jobs - show job selection and details
  await recordAndConvert('jobs', `${BASE_URL}/jobs`, async (page) => {
    await page.waitForTimeout(1000);
    // Click on a job item
    const jobItem = page.locator('[class*="cursor-pointer"]').first();
    if (await jobItem.isVisible()) {
      await jobItem.click();
      await page.waitForTimeout(2000);
    }
    // Click another job
    const secondJob = page.locator('[class*="cursor-pointer"]').nth(2);
    if (await secondJob.isVisible()) {
      await secondJob.click();
      await page.waitForTimeout(1500);
    }
  });
  
  // 3. Market Analysis - scroll through analysis
  await recordAndConvert('market', `${BASE_URL}/market`, async (page) => {
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(1000);
  });
  
  // 4. Stories - search and expand
  await recordAndConvert('stories', `${BASE_URL}/stories`, async (page) => {
    await page.waitForTimeout(1000);
    // Type in search
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.type('AI tools', { delay: 100 });
      await page.waitForTimeout(1500);
      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(500);
    }
    // Expand a story
    const expandBtn = page.locator('button:has-text("▼")').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(2000);
    }
  });
  
  console.log('\n🎉 All GIFs created!');
}

main().catch(console.error);
