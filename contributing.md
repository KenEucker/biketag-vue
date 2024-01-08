# How to Contribute

Thanks for taking the time to contribute!

- [Code of Conduct][code of conduct]


## Submitting Changes

We use [commitizen][commitizen] to enforce [conventional commits][conventional commits]. This enables us to automate both semantic versioning and npm releases.

Install the `commitizen` command line tool:

```bash
npm install -g commitizen
```

Now simply use `git cz` or just `cz` instead of `git commit` when committing.

If you prefer not to install the `commitizen` command globally, alternatively you can use `npm run commit` instead of `git commit`.

## Coding Conventions

- Prettier is ran and applied automatically as part of a precommit hook, so you don't have to worry about semicolons or trailing commas

## Inspirations

This package follows the lead of the Open-Source API [biketag][biketag], with it's configurations for compiling, testing, and contributing to Javascript APIs written in TypeScript. Also, the BikeTag API utilizes the `node-imgur` package to do it's thing, with admiration.

[commitizen]: https://github.com/commitizen/cz-cli
[conventional commits]: https://www.conventionalcommits.org/
[code of conduct]: code_of_conduct.md
[biketag]: https://github.com/kneucker/biketag
