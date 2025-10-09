/**
 * Debug script to test arXiv API directly
 */

const https = require('https');

async function testArxivAPI() {
    const query = 'attention is all you need';
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=1`;
    
    console.log('URL:', url);
    console.log('\nFetching...\n');
    
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Response received:');
                console.log('Status:', res.statusCode);
                console.log('Length:', data.length);
                
                // Try to parse entries
                const entryRegex = /<entry>(.*?)<\/entry>/gs;
                const matches = data.match(entryRegex);
                console.log('\nNumber of entries found:', matches ? matches.length : 0);
                
                if (matches && matches.length > 0) {
                    console.log('\n=== Full First Entry ===');
                    console.log(matches[0]);
                    
                    const entry = matches[0];
                    console.log('\n=== Testing Author Extraction ===');
                    const authorMatches = entry.match(/<author><name>(.*?)<\/name><\/author>/g);
                    console.log('Author matches:', authorMatches);
                    
                    if (authorMatches) {
                        const authors = authorMatches.map(match => match.match(/<name>(.*?)<\/name>/)[1]).join(', ');
                        console.log('Parsed authors:', authors);
                    }
                }
                
                resolve();
            });
        }).on('error', reject);
    });
}

testArxivAPI().catch(console.error);
