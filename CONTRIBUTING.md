# Contributing to tinycache-kit

Thank you for your interest in contributing to **tinycache-kit**! We value contributions from developers of all backgrounds and experience levels.

## Code of Conduct

Please be respectful, collaborative, and constructive in all discussions, issues, and pull requests.

## Development Workflow

### Prerequisites

- Node.js `>= 18.0.0`
- npm `>= 9.0.0`
- Git

### Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/taranveersingh/tinycache-kit.git
   cd tinycache-kit
   ```

2. Verify that existing tests pass:
   ```bash
   npm test
   ```

3. Run coverage report:
   ```bash
   npm run test:coverage
   ```

### Coding Standards

- **Zero Runtime Dependencies**: The core package must never add runtime dependencies.
- **Node.js Built-in Test Runner**: Use `node:test` and `node:assert/strict` for all automated tests.
- **Determinism**: Avoid arbitrary `setTimeout` delays in tests; use deterministic mock clocks where applicable.
- **Coverage**: Keep source line and branch coverage at or near 100%.
- **Documentation**: Provide JSDoc annotations and update TypeScript declarations in `types/index.d.ts` when modifying public APIs.

### Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Commit your changes with clear, descriptive commit messages adhering to Conventional Commits:
   - `feat: add FIFO eviction policy option`
   - `fix: prevent potential memory leak on high churn keys`
   - `docs: improve getOrSet concurrent example`
   - `test: add edge-case test for zero TTL`
3. Ensure all tests and coverage checks pass before submitting.
4. Open a Pull Request on GitHub with a description of the changes and motivation.
