const cp = require('child_process');
const fs = require('fs');

try {
    let output = '';
    try {
        const raw = cp.execSync('npx eslint "**/*.{ts,tsx}" --format json', { encoding: 'utf8' });
        output = JSON.parse(raw);
    } catch (e) {
        output = JSON.parse(e.stdout);
    }

    let summary = '';
    output.forEach(f => {
        if (f.errorCount > 0) {
            summary += f.filePath + ' - ' + f.errorCount + ' errors\n';
            f.messages.forEach(m => {
                summary += '  Line ' + m.line + ': ' + m.message + ' (' + m.ruleId + ')\n';
            });
        }
    });

    fs.writeFileSync('lint-summary.txt', summary, 'utf8');
    console.log('Summary written to lint-summary.txt');
} catch (e) {
    console.error(e.message);
}
