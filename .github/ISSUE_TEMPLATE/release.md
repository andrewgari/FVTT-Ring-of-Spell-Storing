---
name: Release Planning
about: Plan and track a new release
title: 'Release v[VERSION] - [TITLE]'
labels: ['release', 'enhancement']
assignees: ['andrewgari']
---

## Release Information

**Version:** v[VERSION] (e.g., v0.1.0)
**Type:** [patch/minor/major]
**Target Date:** [DATE]

## Changes in This Release

### ✨ New Features
- [ ] Feature 1
- [ ] Feature 2

### 🔧 Improvements
- [ ] Improvement 1
- [ ] Improvement 2

### 🐛 Bug Fixes
- [ ] Bug fix 1
- [ ] Bug fix 2

### 📚 Documentation
- [ ] Documentation update 1
- [ ] Documentation update 2

## Pre-Release Checklist

### Code Quality
- [ ] All linting issues resolved
- [ ] Code review completed
- [ ] No TODO/FIXME comments in production code

### Testing
- [ ] Manual testing completed
- [ ] All features working as expected
- [ ] No breaking changes (or properly documented)

### Documentation
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] Module description accurate

### Release Process
- [ ] Version bumped in module.json
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] GitHub release created
- [ ] Release notes published

## Release Notes Draft

```markdown
## Ring of Spell Storing v[VERSION]

### Installation
Use this manifest URL in Foundry VTT:
```
https://raw.githubusercontent.com/andrewgari/FVTT-Ring-of-Spell-Storing/main/module.json
```

### What's New
- [Brief description of major changes]

### Changes
- [Detailed list of changes]

### Bug Fixes
- [List of bug fixes]

### Compatibility
- Foundry VTT v12+
- D&D 5e System v3.0.0+
```

## Post-Release Tasks

- [ ] Verify release is available on GitHub
- [ ] Test installation from manifest URL
- [ ] Update any external documentation
- [ ] Announce release (if applicable)

## Notes

[Any additional notes or considerations for this release]
