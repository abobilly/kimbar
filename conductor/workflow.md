# Development Workflow

## 1. Core Principles
- **Test-Driven Development:** Write tests before implementation.
- **Atomic Commits:** Commit changes after every completed task.
- **Coverage:** Maintain >80% test coverage.
- **Documentation:** Update relevant documentation with every feature.

## 2. Task Lifecycle
1.  **Select Task:** Choose the next task from the active track's `plan.md`.
2.  **Understand:** Read the task description and relevant context.
3.  **Test:** Write a failing test case that verifies the expected behavior.
4.  **Implement:** Write the minimal code necessary to pass the test.
5.  **Refactor:** Improve code quality without changing behavior.
6.  **Verify:** Run the full test suite to ensure no regressions.
7.  **Commit:** Commit changes with a clear message.
    - Format: `type(scope): description`
    - Example: `feat(auth): implement login validation`
8.  **Record:** Add a summary of the work to Git Notes.
    - Command: `git notes add -m "Task: <task_name> - Summary: <summary>"`
9.  **Update Plan:** Mark the task as complete in `plan.md`.

## 3. Phase Completion Protocol
At the end of each phase (group of tasks):
1.  **Review:** Verify all tasks in the phase are complete.
2.  **Checkpoint:** Tag the commit with the phase name.
    - Command: `git tag -a <phase_id> -m "Phase Complete: <phase_name>"`
3.  **User Manual Verification:** If required by the plan, perform a manual verification step.