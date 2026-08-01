# Package.json additions required

Add these to your existing `package.json` in the Lovable repo:

## Scripts to add

```json
"scripts": {
  "typecheck": "tsc --noEmit",
  "prepare": "husky"
}
```

## Dev dependencies to add

```bash
npm install --save-dev husky lint-staged
```

## lint-staged config to add (in package.json)

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css}": [
    "prettier --write"
  ]
}
```

## After installing, run

```bash
npx husky init
```

This creates the .husky/ directory and wires the prepare script.
