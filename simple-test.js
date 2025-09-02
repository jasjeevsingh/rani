console.log('Simple test module loaded');

class SimpleTest {
    constructor() {
        console.log('SimpleTest constructor called');
    }
}

console.log('Exporting SimpleTest...');
module.exports = SimpleTest;
console.log('Export complete');
