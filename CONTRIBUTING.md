# Contributing to MemVid MCP Server

Thank you for your interest in contributing to MemVid MCP Server! 🎉

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/memvid-mcp-server.git
   cd memvid-mcp-server
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up Python environment**:
   ```bash
   pip install memvid
   ```
5. **Build the project**:
   ```bash
   npm run build
   ```

## 🛠️ Development Workflow

### Making Changes
1. **Create a new branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes** in the `src/` directory
3. **Build and test**:
   ```bash
   npm run build
   npm test
   ```
4. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature description"
   ```

### Testing Your Changes
```bash
# Test the built server
node dist/server.js

# Test with MCP Inspector (if available)
npx @modelcontextprotocol/inspector node dist/server.js
```

## 📝 Contribution Guidelines

### Code Style
- **TypeScript**: Use strict TypeScript with proper typing
- **Formatting**: Follow existing code style (we may add Prettier later)
- **Comments**: Add JSDoc comments for public APIs
- **Error Handling**: Use the established error recovery patterns

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes  
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Areas for Contribution

#### 🎯 High Priority
- **Additional Search Filters**: New filtering capabilities
- **Performance Optimizations**: Improve search and startup times
- **Error Handling**: Enhanced error messages and recovery
- **Documentation**: Examples, tutorials, and guides

#### 🔄 Medium Priority
- **Testing**: Unit and integration tests
- **Memory Bank Sources**: Support for new file types
- **Monitoring**: Additional health checks and metrics
- **Caching**: Advanced caching strategies

#### 🚀 Advanced Features
- **Real-time Updates**: Live memory bank synchronization
- **Collaboration**: Multi-user memory bank sharing
- **Analytics**: Usage metrics and insights
- **Deployment**: Docker and cloud deployment guides

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment**:
   - OS (Windows/Mac/Linux)
   - Node.js version
   - Python version
   - MemVid version

2. **Steps to reproduce**:
   ```
   1. Configure MCP server with...
   2. Run command...
   3. Expected vs actual behavior
   ```

3. **Logs**: Include relevant error messages or logs

4. **MCP Configuration**: Your `mcp.json` configuration (remove sensitive data)

## 💡 Feature Requests

For new features:
1. **Check existing issues** to avoid duplicates
2. **Describe the use case** - what problem does this solve?
3. **Propose a solution** - how should it work?
4. **Consider alternatives** - are there other ways to solve this?

## 🔍 Code Review Process

1. **All contributions** require code review
2. **Maintainers will review** PRs within a few days
3. **Address feedback** by updating your PR
4. **Tests must pass** before merging

## 📋 Pull Request Checklist

- [ ] **Code builds** without errors (`npm run build`)
- [ ] **Tests pass** (`npm test`)
- [ ] **Documentation updated** if needed
- [ ] **Changelog updated** for user-facing changes
- [ ] **Commit messages** follow conventional format
- [ ] **No personal/sensitive data** in code or commits

## 🤝 Community

- **Be respectful** and inclusive
- **Help others** learn and contribute
- **Share knowledge** through documentation and examples
- **Ask questions** if you need clarification

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community support
- **Documentation**: Check README and docs first

## 🎖️ Recognition

Contributors will be:
- **Listed in CONTRIBUTORS.md**
- **Credited in release notes**
- **Thanked in the community**

Thank you for helping make MemVid MCP Server better! 🙌 