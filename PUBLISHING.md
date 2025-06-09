# Publishing Guide for MemVid MCP Server

## Prerequisites

1. **npm account**: Sign up at [npmjs.com](https://npmjs.com)
2. **npm CLI**: Ensure you're logged in: `npm login`
3. **Access permissions**: Ensure you have publish access to `@kcpatt27/memvid-mcp`

## Pre-Publishing Checklist

### 1. Version Management
```bash
# Update version in package.json
npm version patch  # for bug fixes
npm version minor  # for new features  
npm version major  # for breaking changes
```

### 2. Build & Test
```bash
# Clean build
npm run build

# Test CLI locally
node dist/cli.js --help
node dist/cli.js --version
node dist/cli.js --config

# Test server mode
node dist/cli.js --server --help
```

### 3. Verify Package Contents
```bash
# Check what will be published
npm pack --dry-run

# Verify files list in package.json
cat package.json | grep -A 10 "files"
```

## Publishing Process

### 1. Automatic Publishing (Recommended)
```bash
# This will run build, tests, and publish
npm publish
```

The `prepublishOnly` script will automatically run `npm run build`.

### 2. Manual Process
```bash
# Build first
npm run build

# Publish to npm
npm publish --access public
```

### 3. Publishing Beta/Alpha Versions
```bash
# For testing
npm publish --tag beta
npm publish --tag alpha

# Install beta version
npx @kcpatt27/memvid-mcp@beta
```

## Post-Publishing

### 1. Verify Installation
```bash
# Test npx installation
npx @kcpatt27/memvid-mcp --version

# Test setup
npx @kcpatt27/memvid-mcp --help
```

### 2. Update Documentation
- Update README.md if needed
- Create GitHub release
- Update CHANGELOG.md

### 3. Tag Release
```bash
git tag -a v1.1.15 -m "Release v1.1.15"
git push origin v1.1.15
```

## Troubleshooting

### Permission Errors
```bash
# Check npm user
npm whoami

# Check package access
npm access list packages @kcpatt27
```

### Build Issues
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Version Conflicts
```bash
# Check current published version
npm view @kcpatt27/memvid-mcp version

# View all versions
npm view @kcpatt27/memvid-mcp versions --json
```

## Package Structure

The published package includes:
```
dist/
├── cli.js              # Main CLI entry point
├── server.js           # MCP server
├── lib/                # Core libraries
├── tools/              # MCP tools
└── types/              # TypeScript definitions

config/
└── default.json        # Default configuration

package.json            # Package manifest
README.md              # Documentation
LICENSE                # MIT license
```

## Environment Variables for CI/CD

```bash
# For automated publishing
NPM_TOKEN=<your-npm-token>
NODE_AUTH_TOKEN=<your-npm-token>
```

## Security Notes

- Never commit npm tokens to git
- Use `npm audit` to check for vulnerabilities
- Keep dependencies updated
- Review changes before publishing

## Rollback Process

If you need to unpublish or deprecate:

```bash
# Deprecate a version (preferred)
npm deprecate @kcpatt27/memvid-mcp@1.1.15 "Please upgrade to latest version"

# Unpublish (only if published <72 hours ago)
npm unpublish @kcpatt27/memvid-mcp@1.1.15
``` 