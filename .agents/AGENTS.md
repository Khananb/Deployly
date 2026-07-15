### Bug Fix Reporting Rules

Whenever a bug is fixed, you MUST explicitly answer the following 4 questions in your response:
1. **Kya ye production bug hai ya sirf code improvement?** (Is this a production bug or just a code improvement?)
2. **Kya is fix ke liye database migration chahiye?** (Does this fix require a database migration?)
3. **Kya existing users par koi regression risk hai?** (Is there any regression risk for existing users?)
4. **Kya real deployment se verify kiya ya sirf code review?** (Was this verified via real deployment or just code review?)

This ensures a clear distinction between unnecessary optimizations and actual production fixes.


### Bug Triage & Backlog Rules

If a feature already works for a normal customer, **DO NOT** search for hypothetical edge cases.

Only fix bugs that:
- Break deployment
- Lose customer data
- Create downtime
- Create security risk
- Leak server resources

Everything else goes to the **BACKLOG**.

### Deployly Doctor & Dependencies

> **Do not use any external packages if Node.js built-in APIs (`os`, `fs`, `child_process`) are sufficient. Keep Deployly Doctor lightweight and dependency-free.**

