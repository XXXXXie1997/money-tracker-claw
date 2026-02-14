import { chromium } from 'playwright';

const testResults = { passed: [], failed: [] };

function log(testId, name, passed, details = '') {
  console.log(`${passed ? '✅' : '❌'} [${testId}] ${name}${details ? ': ' + details : ''}`);
  (passed ? testResults.passed : testResults.failed).push({ testId, name, passed, details });
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const URL = 'http://localhost:3001';
  
  console.log('\n========================================');
  console.log('记账Web应用 - 功能测试报告');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('========================================\n');

  try {
    // ===== 数据持久化测试 =====
    console.log('\n【模块一：数据持久化】\n');
    
    // TC-DP-001 数据保存验证
    try {
      await page.goto(URL);
      await wait(800);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await wait(500);
      
      // 导航到设置页面检查导出功能
      await page.click('.van-tabbar-item:has-text("设置")');
      await wait(300);
      
      // 检查是否有数据管理区域
      const exportBtn = await page.$('text=导出数据');
      log('TC-DP-001', '数据保存验证', !!exportBtn, exportBtn ? '数据管理功能可用' : '数据管理功能不可用');
    } catch (e) {
      log('TC-DP-001', '数据保存验证', false, e.message);
    }

    // TC-DP-003 导出功能
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("设置")');
      await wait(300);
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        page.click('text=导出数据').catch(() => null)
      ]);
      log('TC-DP-003', '数据导出功能', !!download, download ? '导出成功' : '导出按钮存在');
    } catch (e) {
      log('TC-DP-003', '数据导出功能', false, e.message);
    }

    // TC-DP-004 导入功能
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("设置")');
      await wait(300);
      const importBtn = await page.$('text=导入数据');
      log('TC-DP-004', '数据导入功能', !!importBtn);
    } catch (e) {
      log('TC-DP-004', '数据导入功能', false, e.message);
    }

    // ===== 标签管理测试 =====
    console.log('\n【模块二：标签管理】\n');
    
    // TC-TAG-001 添加标签
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("标签")');
      await wait(500);
      
      // 点击添加按钮
      await page.click('.van-nav-bar .van-icon-plus');
      await wait(300);
      
      // 填写名称
      await page.fill('input', '测试分类');
      await wait(100);
      
      // 提交
      await page.click('.van-button--primary');
      await wait(500);
      
      const tag = await page.$('text=测试分类');
      log('TC-TAG-001', '添加标签', !!tag, tag ? '创建成功' : '创建失败');
    } catch (e) {
      log('TC-TAG-001', '添加标签', false, e.message);
    }

    // TC-TAG-004 编辑标签
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("标签")');
      await wait(500);
      
      // 点击第一个标签
      const tagCell = await page.$('.van-cell');
      if (tagCell) {
        await tagCell.click();
        await wait(300);
        
        // 修改名称
        await page.fill('input', '已编辑');
        await wait(100);
        
        // 保存
        await page.click('.van-button--primary');
        await wait(500);
      }
      
      const edited = await page.$('text=已编辑');
      log('TC-TAG-004', '编辑标签', !!edited, edited ? '编辑成功' : '编辑失败');
    } catch (e) {
      log('TC-TAG-004', '编辑标签', false, e.message);
    }

    // ===== 记账条目测试 =====
    console.log('\n【模块三：记账条目CRUD】\n');
    
    // TC-REC-001 添加支出
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("记账")');
      await wait(500);
      
      // 点击添加
      await page.click('.van-nav-bar .van-icon-plus');
      await wait(500);
      
      // 填写金额 - 使用placeholder定位
      const amountInput = await page.$('input[placeholder="请输入金额"]');
      if (amountInput) {
        await amountInput.fill('66.6');
      } else {
        // 尝试其他选择器
        const inputs = await page.$$('input');
        for (const input of inputs) {
          const type = await input.getAttribute('type');
          if (type === 'number' || type === 'text') {
            await input.fill('66.6');
            break;
          }
        }
      }
      await wait(200);
      
      // 保存
      await page.click('.van-button--primary');
      await wait(600);
      
      // 关闭弹窗
      await page.keyboard.press('Escape');
      await wait(200);
      
      const record = await page.$('text=66.6, text=66');
      log('TC-REC-001', '添加支出记录', !!record, record ? '创建成功' : '创建失败');
    } catch (e) {
      log('TC-REC-001', '添加支出记录', false, e.message);
    }

    // TC-REC-012 月份筛选
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("记账")');
      await wait(500);
      
      const dropdown = await page.$('.van-dropdown-menu');
      log('TC-REC-012', '月份筛选器', !!dropdown, dropdown ? '存在' : '不存在');
    } catch (e) {
      log('TC-REC-012', '月份筛选器', false, e.message);
    }

    // ===== 统计报表测试 =====
    console.log('\n【模块四：统计报表】\n');
    
    // TC-STAT-001 总览卡片
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("统计")');
      await wait(600);
      
      const income = await page.$('.card.income');
      const expense = await page.$('.card.expense');
      const balance = await page.$('.card.balance');
      
      log('TC-STAT-001', '总览卡片', !!(income && expense && balance), 
        (income && expense && balance) ? '收入/支出/结余卡片正常' : '卡片缺失');
    } catch (e) {
      log('TC-STAT-001', '总览卡片', false, e.message);
    }

    // TC-STAT-002~005 时间维度
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("统计")');
      await wait(500);
      
      const day = await page.$('.van-tab:has-text("日")');
      const week = await page.$('.van-tab:has-text("周")');
      const month = await page.$('.van-tab:has-text("月")');
      const year = await page.$('.van-tab:has-text("年")');
      
      log('TC-STAT-002~005', '时间维度切换', !!(day && week && month && year),
        `日:${!!day} 周:${!!week} 月:${!!month} 年:${!!year}`);
    } catch (e) {
      log('TC-STAT-002~005', '时间维度切换', false, e.message);
    }

    // TC-STAT-006 趋势图
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("统计")');
      await wait(600);
      
      const chart = await page.$('.chart-section:has-text("趋势"), canvas');
      log('TC-STAT-006', '趋势图', !!chart, chart ? '存在' : '不存在');
    } catch (e) {
      log('TC-STAT-006', '趋势图', false, e.message);
    }

    // TC-STAT-007 分类占比图
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("统计")');
      await wait(600);
      
      const pie = await page.$('text=支出分类');
      log('TC-STAT-007', '分类占比图', !!pie, pie ? '存在' : '不存在');
    } catch (e) {
      log('TC-STAT-007', '分类占比图', false, e.message);
    }

    // TC-STAT-008 标签筛选
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("统计")');
      await wait(500);
      
      const filter = await page.$('.tag-filter');
      log('TC-STAT-008', '标签筛选', !!filter, filter ? '存在' : '不存在');
    } catch (e) {
      log('TC-STAT-008', '标签筛选', false, e.message);
    }

    // ===== 响应式布局测试 =====
    console.log('\n【模块五：响应式布局】\n');
    
    // TC-RES-001 手机端
    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(URL);
      await wait(800);
      
      const nav = await page.$('.van-tabbar');
      const scrollW = await page.evaluate(() => document.body.scrollWidth);
      log('TC-RES-001', '手机端布局(375x667)', !!nav && scrollW <= 400,
        `导航:${!!nav} 滚动宽度:${scrollW}`);
    } catch (e) {
      log('TC-RES-001', '手机端布局', false, e.message);
    }

    // TC-RES-002 平板端
    try {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(URL);
      await wait(800);
      
      const w = await page.evaluate(() => 
        document.querySelector('.app-container')?.offsetWidth || document.body.offsetWidth
      );
      log('TC-RES-002', '平板端布局(768x1024)', w <= 650, `容器宽度:${w}px`);
    } catch (e) {
      log('TC-RES-002', '平板端布局', false, e.message);
    }

    // TC-RES-003 桌面端
    try {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(URL);
      await wait(800);
      
      const w = await page.evaluate(() => 
        document.querySelector('.app-container')?.offsetWidth || document.body.offsetWidth
      );
      log('TC-RES-003', '桌面端布局(1920x1080)', w <= 750, `容器宽度:${w}px`);
    } catch (e) {
      log('TC-RES-003', '桌面端布局', false, e.message);
    }

    // TC-RES-004 导航切换
    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(URL);
      await wait(500);
      
      const navCount = await page.$$eval('.van-tabbar-item', els => els.length);
      log('TC-RES-004', '底部导航', navCount >= 4, `导航项:${navCount}`);
    } catch (e) {
      log('TC-RES-004', '底部导航', false, e.message);
    }

    // TC-RES-005 暗色模式
    try {
      await page.goto(URL);
      await wait(500);
      await page.click('.van-tabbar-item:has-text("设置")');
      await wait(300);
      
      const darkSwitch = await page.$('.van-switch');
      log('TC-RES-005', '暗色模式', !!darkSwitch, darkSwitch ? '开关存在' : '不存在');
    } catch (e) {
      log('TC-RES-005', '暗色模式', false, e.message);
    }

  } catch (e) {
    console.error('测试失败:', e);
  } finally {
    await browser.close();
  }

  // 汇总
  console.log('\n========================================');
  console.log('测试汇总');
  console.log('========================================');
  const total = testResults.passed.length + testResults.failed.length;
  const rate = total > 0 ? ((testResults.passed.length / total) * 100).toFixed(1) : 0;
  
  console.log(`\n总计: ${total} | 通过: ${testResults.passed.length} ✅ | 失败: ${testResults.failed.length} ❌`);
  console.log(`通过率: ${rate}%\n`);
  
  if (testResults.failed.length > 0) {
    console.log('❌ 失败用例:');
    testResults.failed.forEach(r => console.log(`   [${r.testId}] ${r.name}: ${r.details}`));
  }
  
  console.log('\n✅ 通过用例:');
  testResults.passed.forEach(r => console.log(`   [${r.testId}] ${r.name}`));
  
  console.log('\n========================================\n');
}

runTests();
