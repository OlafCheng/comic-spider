const puppeteer = require('puppeteer');
const chalk = require('chalk');
const emoji = require('node-emoji');
const process = require('process');

const { sleep } = require('./utils');

const { argv } = process;
const log = console.log;

const link = argv[2];

if (!link) {
  log('检查一下是否给了正确的链接吧 ~');
  process.exit();
}

const printSuccess = () => log(chalk.bold.green('successed'));

log(`\n${emoji.get('tada')} 字幕组赛高${emoji.get('tada')} \n`);

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.setViewport({
    height: 3840,
    width: 2800
  });

  log(`${emoji.get('link')} Linking Webpage ...`);
  log(`${chalk.yellow(link)}`);
  await page.goto(link);
  let totalPage = 0;
  let current = 0;
  printSuccess();
  log();

  async function updatePageInfo() {
    await sleep(100);
    const paginatorHandler = await page.$('#pageSliderCounter');
    const text = await page.evaluate(
      el => el.textContent,
      paginatorHandler
    );
    if (text) {
      try {
        const regResult = text.match(/(\d+)\/(\d+)/);
        regResult && (current = +regResult[1]) && (totalPage = +regResult[2]);
      } catch (e) {
        throw Error('Failed: totalPage parse.');
      }
    }
  }

  async function waitRender() {
    async function countLoadings() {
      return await page.$$eval(
        '.loading',
        els => els.length
      );
    }

    async function isNotFinished() {
      return await page.$$eval(
        '.loading',
        els => els.some(el => el.style === undefined || el.style.visibility !== 'hidden')
      );
    }

    while(await !countLoadings()) {
      sleep(100);
    }

    while(await isNotFinished()) {
      sleep(100);
    }

    if (current === 1) {
      let isRenderFinished = false;
      while (!isRenderFinished) {
        sleep(100);
        isRenderFinished = await page.$eval('#viewport0', el => el.style.zIndex === '-1');
      }
    }
  }

  async function nextPage() {
    await page.keyboard.press('ArrowLeft');
  }

  log('Initalizing Webpage ...');
  while(!current) {
    await updatePageInfo();
  }
  printSuccess();
  
  await page.$eval('#menu', el => el.style.visibility = 'hidden');
  await page.$eval('#pageSliderBarBackground', el => el.style.visibility = 'hidden');

  while(current <= totalPage) {
    log(`\nRendering page ${current} ...`);
    await waitRender();
    printSuccess();
    log(`Saving page ${current} ...`);
    await page.screenshot({
      path: `./images/${current}.png`
    });
    printSuccess();
    if (current === totalPage) {
      break;
    }
    await nextPage();
    const prev = current;
    await updatePageInfo();
    if (current === prev) {
      break;
    }
    log(`${emoji.get('arrow_right')} Goto next page ...`);
  }

  log(`\n${chalk.bold.green('ENDED')}`);
  await browser.close();
})();
