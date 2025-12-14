# Contributing to DevPilot

Thanks for helping improve DevPilot! Keep changes small, typed, and documented so CodeRabbit and humans can review quickly.

## Getting Started

1. **Fork and Clone**: Fork the repository and clone your fork
2. **Install Dependencies**: Run `npm install` in `apps/web`
3. **Create Branch**: Create a feature branch from `main`
4. **Make Changes**: Keep changes focused and well-documented
5. **Test**: Verify your changes work locally
6. **Submit PR**: Open a pull request with clear description

## Workflow

- **Branch Strategy**: Branch from `main`; keep PRs scoped to one logical change
- **Testing**: Run `npm run lint` (or relevant checks) before opening a PR
- **Documentation**: Update docs when behavior changes
- **Commit Messages**: Use clear, descriptive commit messages
- **PR Size**: Keep PRs small and focused (easier to review)

## Code Areas

### Project Structure
- **apps/web**: Next.js app router UI + API routes
  - `app/`: Next.js pages and API routes
  - `lib/`: Shared utilities, storage, agent logic
  - `components/`: React components (if any)
- **cli/**: DevPilot CLI entry (`devpilot scaffold|tests|refactor`)
  - `devpilot-cli.ts`: Main CLI entry point
- **apps/web/lib**: Agent logic, storage helpers
  - `store.ts`: Storage abstraction (Redis/file)
  - `kestra-summary.ts`: Summary generation logic
  - `agents.ts`: Agent task execution
- **workflows/kestra**: Kestra YAML workflows
  - `nightly-tests.yml`: Scheduled test runs
  - `refactor-summary.yml`: Refactor analysis
- **ml/**: Oumi RL fine-tuning scaffold
  - `oumi_train.py`: Training script
  - `configs/`: Configuration files

## Style

### Code Style
- **TypeScript**: Strict mode enabled; prefer small, composable modules
- **UI**: TailwindCSS for styling; keep class lists readable
- **Tests**: Add/adjust tests when changing logic
- **Functions**: Keep functions small and focused (single responsibility)
- **Naming**: Use descriptive names; avoid abbreviations
- **Comments**: Add JSDoc comments for exported functions

## Commits/PRs

### Commit Guidelines
- **Format**: Use conventional commits format when possible
  - `feat:` for new features
  - `fix:` for bug fixes
  - `refactor:` for code refactoring
  - `docs:` for documentation changes
- **Message**: Clear, descriptive commit messages
- **Scope**: One logical change per commit

### Pull Request Guidelines
- **Title**: Clear, descriptive title
- **Description**: Include what changed, why, and how to test
- **Size**: Keep PRs small and focused (easier for CodeRabbit to review)
- **CodeRabbit**: Repository includes `.coderabbit.yml`; keep PRs scoped to included paths
- **Testing**: Describe how to test your changes

## Environment

### Local Development
- Copy `apps/web/env.local.example` to `.env.local` for local runs
- Set up Redis (optional) for persistent storage testing
- Configure API keys (optional) for AI summary testing

### Environment Variables
- `REDIS_URL`: Redis connection string (production)
- `TOGETHER_API_KEY`: Together.ai API key (optional)
- `GROQ_API_KEY`: Groq API key (optional)
- `HUGGINGFACE_API_KEY`: Hugging Face API key (optional)

## Questions?

Open an issue or reach out to maintainers for help.

