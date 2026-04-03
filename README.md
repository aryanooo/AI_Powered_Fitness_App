# Full Stack FastAPI Template

Clean full stack template with a FastAPI backend and a React frontend.

## Business Problem

Many people want a simple, reliable way to turn their fitness goals into clear weekly actions. Generic plans are hard to follow, and most apps do not connect the user profile, daily behavior, and coaching guidance in one place.

## Proposed Solution

This product combines a fitness profile, AI coaching, and plan generation in a single workspace. Users can chat with a coach, generate tailored workout and diet plans, and keep everything organized in one dashboard.

## User Journey Scenario

1. A new user signs up and logs in
2. They complete a fitness profile with goal, experience, and preferences
3. They generate a workout plan and then a diet plan that fits the workout
4. They chat with the coach for adjustments and questions
5. They review recent plans and keep improving over time

## Tech Stack

1. FastAPI for the Python API
2. SQLModel and PostgreSQL for data
3. Pydantic for validation and settings
4. React with TypeScript and Vite
5. Tailwind CSS and shadcn ui components
6. Docker Compose for local and production setups
7. JWT authentication and password recovery
8. Playwright for end to end tests
9. GitHub Actions CI

## Quick Start

1. Copy the repo
2. Configure the environment files
3. Run the dev stack

## Configure

Update values in the .env files before running or deploying.

Minimum changes:
1. SECRET_KEY
2. FIRST_SUPERUSER_PASSWORD
3. POSTGRES_PASSWORD

Generate a secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Use as a Private Repo

1. Create a new repository on GitHub
2. Clone this template into a new folder

```bash
git clone git@github.com:fastapi/full-stack-fastapi-template.git my-full-stack
```

3. Set your new repo as origin

```bash
git remote set-url origin git@github.com:octocat/my-full-stack.git
```

4. Add the template as upstream for future updates

```bash
git remote add upstream git@github.com:fastapi/full-stack-fastapi-template.git
```

5. Push to your repository

```bash
git push -u origin master
```

## Update From Template

1. Fetch latest changes without committing

```bash
git pull --no-commit upstream master
```

2. Resolve conflicts if needed
3. Finish the merge

```bash
git merge --continue
```

## Copier Alternative

You can also generate a project using Copier.

Install Copier:

```bash
pip install copier
```

Or with pipx:

```bash
pipx install copier
```

Generate a project:

```bash
copier copy https://github.com/fastapi/full-stack-fastapi-template my-awesome-project --trust
```

## Docs

Backend docs: backend/README.md
Frontend docs: frontend/README.md
Deployment docs: deployment.md
Development docs: development.md
Release notes: release-notes.md

## License

MIT
