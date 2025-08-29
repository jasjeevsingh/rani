````markdown
# Contributing to RANI

Thank you for considering contributing to **RANI (Research Assistant for Novel Inquiry)**! Contributions make our research-focused open-source community vibrant, innovative, and collaborative. We appreciate every contribution you make—big or small.

This document guides you through the entire contribution process, from finding an issue to getting your pull request merged.

---

## 🚀 Contribution Workflow

To ensure a smooth and effective workflow, all contributions must go through the following process. Please follow these steps carefully.

### 1. Find or Create an Issue

All work begins with an issue. This is the central place to discuss new research features and track progress.

-   Browse our existing [**Issues**](https://github.com/jasjeevsingh/rani/issues) to find something you'd like to work on. We recommend looking for issues labeled `good first issue` or `research feature` if you're new!
-   If you have a new research feature idea or find a bug that hasn't been reported, please **create a new issue** using our templates.

### 2. Claim the Issue

To avoid duplicate work, you must claim an issue before you start coding.

-   On the issue you want to work on, leave a comment with the command:
    ```
    /assign
    ```
-   A maintainer will assign the issue to you. Once your profile appears in the **`Assignees`** section, you are ready to start development.

### 3. Fork & Create a Branch

Now it's time to set up your local environment.

1.  **Fork** the repository to your own GitHub account.
2.  **Clone** your forked repository to your local machine.
3.  **Create a new branch** from `main`. A clear branch name is recommended.
    -   For research features: `feat/research-feature-description` (e.g., `feat/pdf-annotation-system`)
    -   For bug fixes: `fix/short-description` (e.g., `fix/document-upload-error`)
    -   For documentation: `docs/section-name` (e.g., `docs/research-modes`)

### 4. Develop

Write your code! As you work, please adhere to our quality standards.

-   **Code Style & Quality**: Our project uses `Prettier` and `ESLint` to maintain a consistent code style.
-   **Architecture & Design Patterns**: All new code must be consistent with the project's research-focused architecture. Please read our **[Design Patterns Guide](./docs/DESIGN_PATTERNS.md)** before making significant changes.
-   **Research Context**: Ensure your features align with academic research workflows and usability.

### 5. Create a Pull Request (PR)

Once your work is ready, create a Pull Request to the `main` branch of the original repository.

-   **Fill out the PR Template**: Our template will appear automatically. Please provide a clear summary of your changes and their research benefits.
-   **Link the Issue**: In the PR description, include the line `Closes #XXX` (e.g., `Closes #123`) to link it to the issue you resolved. This is mandatory.
-   **Code Review**: A maintainer will review your code, provide feedback, and merge it.

---

# 🔬 Research Development Focus

RANI is specifically designed for academic and research workflows. When contributing, consider:

## Research Use Cases
- **Paper Analysis**: Features that help researchers understand and annotate academic papers
- **Discovery Tools**: Functionality for finding related work and research connections  
- **Experimentation**: Tools for testing hypotheses and running quick experiments
- **Collaboration**: Features that facilitate research team collaboration

## Core Architecture

RANI is built on a service-repository pattern that was inherited from the Glass foundation:

### Key Components
```
src/features/
├── documents/          # PDF processing & document management
├── research/          # Paper discovery, annotations, experiments  
├── ask/              # AI conversation engine with research context
├── listen/           # Audio transcription for lectures/meetings
└── common/           # Shared research utilities
```

### Research-Specific Enhancements
- **Multi-modal AI**: Integrates text, images, and audio for comprehensive research assistance
- **Document Analysis**: PDF parsing, annotation storage, and cross-referencing
- **Knowledge Graph**: Connects ideas, papers, and conversations
- **Research Personas**: AI responses tailored for different research contexts

## Development Guidelines

### Adding Research Features
1. **Start with user research**: Understand the academic workflow you're improving
2. **Leverage existing infrastructure**: Build on Glass's robust audio/screen capture foundation
3. **Maintain context awareness**: Research features should integrate with conversation history
4. **Consider privacy**: Research data should remain secure and private by default

### Code Organization
- Place research-specific UI in `src/ui/research/`
- Add new research services in `src/features/research/`
- Update prompts in `src/features/common/prompts/` with research context
- Document new features in `docs/` with research use cases

# Developing

### Prerequisites

Ensure the following are installed:
- [Node.js v20.x.x](https://nodejs.org/en/download)
- [Python 3.8+](https://www.python.org/downloads/)
- (Windows users) [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/)

Ensure you're using Node.js version 20.x.x to avoid build errors with native dependencies.

```bash
# Check your Node.js version
node --version

# If you need to install Node.js 20.x.x, we recommend using nvm:
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# nvm install 20
# nvm use 20
```

## Setup and Build

```bash
# Initial setup
git clone https://github.com/jasjeevsingh/rani.git
cd rani
npm run setup

# Development mode
npm start

# Build for production
npm run build
```

Please ensure that you can make a full production build before pushing code.

## Testing Research Features

When developing research-specific features:

```bash
# Test PDF processing
npm run test:documents

# Test research modes  
npm run test:research

# Test AI integration
npm run test:ai
```

## Linting

```bash
npm run lint
```

If you get errors, be sure to fix them before committing.

## 📚 Research Feature Areas

We welcome contributions in these research-focused areas:

### 🚧 Current Priorities
- [ ] **PDF Annotation System**: Highlighting and note-taking for research papers
- [ ] **Paper Discovery**: Integration with Semantic Scholar and arXiv APIs
- [ ] **Research Prompts**: AI personas tailored for different research contexts
- [ ] **Code Sandbox**: Jupyter-like environment for testing research concepts

### 🔮 Future Research Features
- [ ] **Citation Management**: Integration with reference managers
- [ ] **Research Collaboration**: Team features for shared research projects
- [ ] **Knowledge Graphs**: Visual representation of research connections
- [ ] **Multi-language Support**: International research community support

### 🎯 Research UX Improvements
- [ ] **Academic Workflows**: Streamlined interfaces for common research tasks
- [ ] **Accessibility**: Features for researchers with different needs
- [ ] **Mobile Companion**: Tablet/phone apps for field research

---

## 🤝 Community

- **Questions**: Use [GitHub Discussions](https://github.com/jasjeevsingh/rani/discussions)
- **Bug Reports**: Create detailed [GitHub Issues](https://github.com/jasjeevsingh/rani/issues)
- **Feature Requests**: Propose new research features via issues
- **Research Use Cases**: Share how you use RANI in your research workflow

Thank you for helping make RANI a powerful tool for the global research community! 🔬✨
````