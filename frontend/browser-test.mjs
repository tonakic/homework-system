import puppeteer from "puppeteer-core";

async function test() {
  console.log("启动浏览器测试...");

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    console.log("成功启动浏览器");
  } catch (e) {
    console.log("无法启动浏览器:", e.message);
    console.log("请手动访问 http://192.168.3.74:8080/diagnostic.html 进行测试");
    return;
  }

  const page = await browser.newPage();

  console.log("访问诊断页面...");
  await page.goto("http://localhost:8080/diagnostic.html", { waitUntil: "networkidle2" });

  await page.screenshot({ path: "screenshot-initial.png", fullPage: true });
  console.log("截图保存: screenshot-initial.png");

  console.log("点击 CDN Fail Toast 按钮...");
  await page.click("button:nth-of-type(2)"); // CDN Fail Toast 按钮
  await page.waitForTimeout(500);

  const toast = await page.$(".van-toast");
  if (toast) {
    const toastContent = await toast.evaluate(el => {
      return {
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        zIndex: window.getComputedStyle(el).zIndex,
        text: el.textContent,
        innerHTML: el.innerHTML
      };
    });
    console.log("Toast 内容:", JSON.stringify(toastContent, null, 2));
  } else {
    console.log("未找到 Toast 元素!");
  }

  await page.screenshot({ path: "screenshot-toast.png", fullPage: true });
  console.log("截图保存: screenshot-toast.png");

  const logContent = await page.$eval("#log", el => el.textContent);
  console.log("页面日志:", logContent);

  await browser.close();
  console.log("测试完成");
}

test().catch(e => console.error("测试失败:", e));