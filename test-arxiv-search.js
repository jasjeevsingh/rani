/**
 * Test script for arXiv search functionality
 * Run with: node test-arxiv-search.js
 */

const ResearchService = require('./src/features/research/researchService.js');

async function testArxivSearch() {
    console.log('=== Testing arXiv Search Implementation ===\n');
    
    // Initialize the research service (without database for testing)
    const researchService = new ResearchService(null);
    
    try {
        // Test 1: Simple query
        console.log('Test 1: Searching for "attention is all you need"...');
        const results1 = await researchService.searchPapers('attention is all you need', {
            limit: 3,
            source: 'arxiv'
        });
        
        console.log(`Found ${results1.length} papers:`);
        results1.forEach((paper, idx) => {
            console.log(`\n${idx + 1}. ${paper.title}`);
            console.log(`   Authors: ${paper.authors}`);
            console.log(`   Year: ${paper.year}`);
            console.log(`   arXiv ID: ${paper.arxivId}`);
            console.log(`   URL: ${paper.url}`);
            console.log(`   Abstract: ${paper.abstract.substring(0, 150)}...`);
        });
        
        // Test 2: Different query
        console.log('\n\n=== Test 2: Searching for "machine learning"...');
        const results2 = await researchService.searchPapers('machine learning', {
            limit: 5,
            source: 'arxiv'
        });
        
        console.log(`Found ${results2.length} papers:`);
        results2.forEach((paper, idx) => {
            console.log(`${idx + 1}. ${paper.title} (${paper.year})`);
        });
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
testArxivSearch();
