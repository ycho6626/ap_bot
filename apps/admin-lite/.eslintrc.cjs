/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['../../eslint.config.nextjs.cjs'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Admin-lite app specific rules can be added here
    // The shared config already includes Next.js rules and TypeScript strict rules
  },
};
