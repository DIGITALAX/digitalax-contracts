# Introduction

### Welcome to DIGITALAX!

>First off, thank you for considering contributing to DIGITALAX. This documentation is meant to help internal and external collaborators make meaningful contributions to the project

### Getting Started

>Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.
>
>

To work on this repository, you should first develop a good understanding of the DIGITALAX project and the different components working. Please Check Out: [DIGITALAX Gitbook](https://digitalax.gitbook.io/digitalax/) to read our intro to DIGITALAX.
Make sure to read the relevant README files in the repository you are looking to modify or create an issue for.

### What is an acceptable contribution?

Improving documentation, non-critical bug reporting, improving code and unit tests, writing tutorials are all examples of helpful contributions.

Create Github Pull requests for any and all modifications to the repository

Create Issues for bugs, difficult technical questions, integration issues, important missing features, and technical debt. 


We also welcome

>* Spelling / grammar fixes
>* Typo correction, white space and formatting changes
>* Comment clean up
>* Contributions to improve this guide and the README files

**Do not report live security vulnerabilities in this public issue tracker.**


### What if I need to contact the team?

Please do not use the issue tracker for support or general project inquiries. 

Check out our [website](https://digitalax.xyz/homepage) for our up to date social media and community group pages.
# Ground Rules

> Responsibilities
 * Ensure cross-platform compatibility for every change that's accepted. Windows, Mac, Debian & Ubuntu Linux.
 * Create issues for any major changes and enhancements that you wish to make. Discuss things transparently and get community feedback.
 * Don't add any new smart contracts or classes to the codebase unless absolutely needed. Try modifying already existing classes unless abstraction is necessary or you need to add another feature.
 * Be welcoming to newcomers and encourage diverse new contributors from all backgrounds.

# How to report a bug

If you find a security vulnerability, do NOT open an issue. Email emma.jane@digitalax.xyz instead. Some questions to ask yourself:

> * Can I access something that's not mine, or something I shouldn't have access to?
> * Can I disable something for other people?
>
 If the answer to either of those two questions are "yes", then you're probably dealing with a security issue. Note that even if you answer "no" to both questions, you may still be dealing with a security issue, so if you're unsure, just email us at emma.jane@digitalax.xyz
 
### How to file a bug report
 When filing a complex issue or technical inquiry, make sure to answer these five questions, be as specific as possible:
>
> 1. What version of Node are you using?
> 2. What branch and/or version are you referring to?
> 3. What operating system and processor architecture are you using?
> 4. What did you try to do?
> 5. What behaviour did you expect to see?
> 6. What behaviour did you see instead?
> 7. Do you have any example code?

### How to suggest a feature or enhancement

> 1. Define how the application currently works
> 2. Explain the enhancement you are interested in
> 3. If you understand the code, tell us where/how you think the enhancement should be implemented


# How to submit a pull request contribution

### We Develop with Github
We use github to host DIGITALAX project code, to track issues and feature requests, as well as accept pull requests.

### We Use Github Flow, So All Code Changes Happen Through Pull Requests
Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. Update code, make sure to follow the syntax and styling of the repository
3. If you've added code that should be tested, add or update tests. This means any new classes, functions, changes to parameters/return types, or logical changes.
4. If you make a significant smart contract change, update the subgraph code associated with that indexing.
5. Ensure the test suite passes locally.
6. For good measure, run yarn coverage to make sure that you are not reducing coverage. We strive towards 100% code coverage
7. Use descriptive commit comments.
8. Issue your pull request to the `develop` branch (use `main` if there is no `develop` branch in the repo)

### Code review process

If you submit a Pull request, the DIGITALAX team will review it within a reasonable time frame. 

One certified reviewer who is part of the organization will review, and then either approve the PR or request changes from you.

Once the review is approved, the code will be merged into the `develop` branch. It will be merged to `main` through a regular PR afterwards if there are no smart contract changes

If there are smart contract changes, some changes may need to go through audit before reaching the audited `main` branch

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

    Using welcoming and inclusive language
    Being respectful of differing viewpoints and experiences
    Gracefully accepting constructive criticism
    Focusing on what is best for the community
    Showing empathy towards other community members

Examples of unacceptable behavior by participants include:

    The use of sexualized language or imagery and unwelcome sexual attention or advances
    Trolling, insulting/derogatory comments, and personal or political attacks
    Public or private harassment
    Publishing others' private information, such as a physical or electronic address, without explicit permission
    Other conduct which could reasonably be considered inappropriate in a professional setting


### Our Responsibilities

DIGITALAX Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, or to ban temporarily or permanently any contributor for other behaviors that they deem inappropriate, threatening, offensive, or harmful.

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at emma.jane@digitalax.xyz. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances. The project team is obligated to maintain confidentiality with regard to the reporter of an incident. Further details of specific enforcement policies may be posted separately.

Project maintainers who do not follow or enforce the Code of Conduct in good faith may face temporary or permanent repercussions as determined by other members of the project's leadership.

### About this guide
This guide was built up based on the [contributing-template](https://github.com/nayafia/contributing-template/blob/master/CONTRIBUTING-template.md) project as well as  from the Contributor Covenant, version 1.4, available at http://contributor-covenant.org/version/1/4 . Contributions to this guide, are of course welcome.