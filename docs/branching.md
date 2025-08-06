# Git Branching Strategy

This document proposes a Git branching strategy for structured collaboration within the project.

---

## 1. Motivation

In multi-module projects with separate responsibilities (e.g. Arduino, Backend, Frontend, Database), a clearly defined branching strategy helps to:

- avoid merge conflicts,
- maintain a clean and stable `main` branch,
- improve collaboration via clear workflows.

---

## 2. Strategy selection

The following models were evaluated:

- **Git Flow**: full-featured but complex; more suitable for long release cycles.
	https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow
- **GitHub Flow**: lightweight and CI/CD-friendly.
	https://docs.github.com/en/get-started/using-github/github-flow
- **Trunk-Based Development**: promotes short-lived branches and continuous integration.
	https://trunkbaseddevelopment.com/

Among these, **a combination of GitHub Flow and Trunk-Based Development** is proposed, as it allows:
- short feature branches for parallel development,
- the ability of integrating with CI tools
- clear merge and review processes.

**Rules:**
- All development is done on short-lived branches derived from `main`.
- Each change is reviewed and merged via Pull Request.
- CI checks (tests, linters) must pass before merging.

---

## 3. Branch naming
Type/action-module

| Type      | Example                   | Use case               |
| --------- | ------------------------- | ---------------------- |
| `feature` | `feature/add-backend-api` | New functionality      |
| `fix`     | `fix/mqtt-reconnect`      | Bug fix                |
| `docs`    | `docs/update-readme`      | Documentation          |
| `test`    | `test/add-backend-tests`  | Testing-related change |
| `chore`   | `chore/update-gitignore`  | Setup or config change |

Use lowercase and dashes.  

---

## 4. Developer workflow

1. Create a feature branch from `main`:
```bash
	git checkout main
	git pull origin main
	git checkout -b feature/<task-name>
   ```

2. Git commit and push the branch to GitHub:
``` bash
	git commit
	git push origin feature/<task-name>
```

3. Create a Pull Request in github

4. Code Review

5. After successful review and test, merge and delete the branch:
```bash
	git branch -d feature/<task-name>
	git push origin --delete feature/<task-name>

```

---
## 5. Merge and CI 

- `main` should be a protected branch (no direct pushes)
- All changes must go through PRs
- Merges are only allowed after successful CI
- "Squash and merge" is recommended to keep history clean

---
