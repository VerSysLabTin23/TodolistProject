
1. Branch naming

Type/action-module
Type 	Example 	Use case
feature 	feature/add-backend-api 	New functionality
fix 	fix/mqtt-reconnect 	Bug fix
docs 	docs/update-readme 	Documentation
test 	test/add-backend-tests 	Testing-related change
chore 	chore/update-gitignore 	Setup or config change

Use lowercase and dashes.
2. Developer workflow

    Create a feature branch from main:

	git checkout main
	git pull origin main
	git checkout -b feature/<task-name>

    Git commit and push the branch to GitHub:

	git commit
	git push origin feature/<task-name>

    Create a Pull Request in github

    Code Review

    After successful review and test, merge and delete the branch:

	git branch -d feature/<task-name>
	git push origin --delete feature/<task-name>

3. Merge and CI

    main should be a protected branch (no direct pushes)
    All changes must go through PRs
    Merges are only allowed after successful CI
    "Squash and merge" is recommended to keep history clean
