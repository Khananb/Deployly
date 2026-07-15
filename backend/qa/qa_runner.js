const fs = require('fs');
const path = require('path');

// Test files in order of execution
const TEST_FILES = [
    'auth.test.js',
    'static.test.js',
    'node.test.js',
    'redeploy.test.js',
    'delete.test.js'
];

async function runAll() {
    const args = process.argv.slice(2);
    let onlyTest = null;
    if (args.includes('--only')) {
        const index = args.indexOf('--only');
        onlyTest = args[index + 1];
    }

    console.log("===================================");
    console.log("      DEPLOYLY QA FRAMEWORK        ");
    console.log("===================================");
    console.log(`Using Base URL: ${process.env.QA_BASE_URL || 'http://localhost:3000/api'}\n`);

    const results = [];
    let state = {};
    let passedCount = 0;
    let failedCount = 0;
    const startTime = Date.now();

    for (const file of TEST_FILES) {
        const testModule = require(path.join(__dirname, file));
        const testName = testModule.name;

        // Support skipping via --only
        if (onlyTest && !testName.toLowerCase().includes(onlyTest.toLowerCase()) && !file.toLowerCase().includes(onlyTest.toLowerCase())) {
            continue;
        }

        process.stdout.write(`Running [${testName}]... `);
        const testStart = Date.now();
        
        try {
            state = await testModule.run(state);
            const duration = ((Date.now() - testStart) / 1000).toFixed(2);
            console.log(`✅ PASS (${duration}s)`);
            results.push({ name: testName, status: 'PASS', duration: `${duration}s` });
            passedCount++;
        } catch (error) {
            const duration = ((Date.now() - testStart) / 1000).toFixed(2);
            console.log(`❌ FAIL (${duration}s)`);
            console.error(`\nReason: ${error.message}\n`);
            results.push({ name: testName, status: 'FAIL', duration: `${duration}s`, reason: error.message });
            failedCount++;
            break; // Stop immediately on first failure
        }
    }

    const totalTimeMs = Date.now() - startTime;
    const minutes = Math.floor(totalTimeMs / 60000);
    const seconds = ((totalTimeMs % 60000) / 1000).toFixed(0);
    const timeStr = `${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`;

    // Generate Report String
    let reportStr = `QA REPORT\n\n`;
    reportStr += `PASS\n`;
    results.filter(r => r.status === 'PASS').forEach(r => {
        reportStr += `✔ ${r.name}\n`;
    });
    
    reportStr += `\nFAIL\n`;
    const failedTests = results.filter(r => r.status === 'FAIL');
    if (failedTests.length === 0) {
        reportStr += `None\n`;
    } else {
        failedTests.forEach(r => {
            reportStr += `❌ ${r.name} - ${r.reason}\n`;
        });
    }
    
    reportStr += `\nTime\n${timeStr}\n`;
    reportStr += `\nSummary: PASS ${passedCount}, FAIL ${failedCount}\n`;

    console.log("\n===================================");
    console.log(reportStr);
    console.log("===================================");

    // Save report to file
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    const dateStr = new Date().toISOString().split('T')[0];
    const reportPath = path.join(reportsDir, `${dateStr}.txt`);
    
    // Append if exists, or write new
    fs.appendFileSync(reportPath, `\n--- Run at ${new Date().toISOString()} ---\n${reportStr}\n`);
    console.log(`\nReport saved to: ${reportPath}`);

    if (failedCount > 0) {
        process.exit(1);
    }
}

runAll().catch(err => {
    console.error("Fatal Error in QA Runner:", err);
    process.exit(1);
});
