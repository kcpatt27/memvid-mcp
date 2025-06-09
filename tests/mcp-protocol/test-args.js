console.log('process.argv:', JSON.stringify(process.argv, null, 2));
console.log('args[2]:', process.argv[2]);
console.log('includes --mcp:', process.argv.includes('--mcp'));
console.log('stdin.isTTY:', process.stdin.isTTY); 