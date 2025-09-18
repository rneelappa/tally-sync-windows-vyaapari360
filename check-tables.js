const yaml = require('js-yaml');
const fs = require('fs');

const config = yaml.load(fs.readFileSync('tally-export-config.yaml', 'utf8'));

console.log('Master tables:');
config.master.forEach(t => console.log(`  - ${t.name}`));

console.log('\nTransaction tables:');
config.transaction.forEach(t => console.log(`  - ${t.name}`));
