# rehype-mdx-elements

**[rehype][]** plugin to convert MDX JSX elements to regular HTML elements.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`rehypeMdxElements(options?)`](#rehypemdxelementsoptions)
    *   [`Options`](#options)
*   [Types](#types)
*   [Security](#security)
*   [Related](#related)
*   [License](#license)

## What is this?

This package is a [unified][] ([rehype][]) plugin to convert MDX JSX element
nodes to regular HTML elements that can be handled by component mapping.

**unified** is a project that transforms content with abstract syntax trees
(ASTs).
**rehype** adds support for HTML to unified.
**MDX** is markdown that supports JSX.
**hast** is the HTML AST that rehype uses.
This is a rehype plugin that transforms MDX JSX elements in the hast.

## When should I use this?

This plugin is useful when you want to render arbitrary markdown with custom
component support while maintaining security.
Unlike full MDX implementations that support JSX expressions and imports,
this plugin only processes JSX elements with literal attributes, making it
safe for untrusted content.

Use this plugin when you need to:

*   Render arbitrary markdown with custom components
*   Preserve case-sensitive component names and attributes
*   Avoid the security risks of full JSX expression evaluation

## Install

This package is [ESM only][esm].

```sh
npm install rehype-mdx-elements
```

```sh
yarn add rehype-mdx-elements
```

```html
<script type="module">
  import {rehypeMdxElements} from 'https://esm.sh/rehype-mdx-elements?bundle'
</script>
```

## Use

`example.mdx`:

```md
# Hello

<Button variant="primary">Click me</Button>

Some text with <Alert type="warning">important info</Alert>.

<script>alert('xss')</script>
```

`example.tsx`:

```tsx
import {readFileSync} from 'node:fs'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkRehype from 'remark-rehype'
import {rehypeMdxElements} from 'rehype-mdx-elements'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsx, jsxs} from 'react/jsx-runtime'
import React from 'react'

// Component definitions
const Button = (props: {variant?: string; children?: React.ReactNode}) => (
  <button className={`btn ${props.variant || 'default'}`}>
    {props.children}
  </button>
)

const Alert = (props: {type?: string; children?: React.ReactNode}) => (
  <div className={`alert alert-${props.type || 'info'}`}>
    {props.children}
  </div>
)

const components = {Button, Alert}

const file = readFileSync('example.mdx')

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkRehype, {passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement']})
  .use(rehypeMdxElements, {
    allowedElements: Object.keys(components)
  })

const tree = processor.parse(file)
const transformedTree = await processor.run(tree)

// Convert to React elements
const reactElement = toJsxRuntime(transformedTree, {
  Fragment,
  jsx,
  jsxs,
  components
})

console.log(reactElement)
```

Running `example.tsx` produces JSX runtime elements with the following content:

```jsx
<>
  <h1>Hello</h1>
  <Button variant="primary">Click me</Button>
  <p>Some text with <Alert type="warning">important info</Alert>.</p>
</>
```

## API

### `rehypeMdxElements(options?)`

Convert MDX JSX elements to regular HTML elements.

###### Parameters

*   `options` ([`Options`][api-options], optional)
    — configuration

###### Returns

Transform ([`Transformer`][unified-transformer]).

### `Options`

###### Fields

*   `allowedElements` (`Array<string>`, optional)
    list of allowed component names, case insensitive.
    If provided, only these components will be converted to HTML elements.
    Other JSX elements will be removed.
*   `disallowedElements` (`Array<string>`, optional)
    list of disallowed component names, case insensitive.
    These components will be removed from the output.

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Security

MDX JSX elements can contain arbitrary JavaScript expressions, which is
dangerous when executed in an untrusted environment.
This plugin helps mitigate security risks by:

1.  Only converting JSX elements to omit imports and expressions which could contain arbitrary code
2.  Only converting JSX attributes with simple string values or are void
3.  Allowing you to specify which component names are allowed or disallowed

## Related

*   [`remark-mdx`][remark-mdx]
     add support for MDX syntax
*   [`remark-rehype`][remark-rehype]
     transform markdown to HTML

## License

[MIT][license] © [Tim Etler][author]

[api-options]: #options

[api-rehype-mdx-elements]: #rehypemdxelementsoptions

[author]: https://yourwebsite.com

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[license]: LICENSE.md

[rehype]: https://github.com/rehypejs/rehype

[remark-mdx]: https://github.com/mdx-js/mdx/tree/main/packages/remark-mdx

[remark-rehype]: https://github.com/remarkjs/remark-rehype

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[unified-transformer]: https://github.com/unifiedjs/unified#transformer
