import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkRehype from "remark-rehype";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React, { type JSX, type FunctionComponent } from "react";
import { renderToString } from "react-dom/server";
import { VFile } from "vfile";
import type { Parents as HastParents } from "hast";
import { rehypeMdxElements } from "@/index.js";

// Type declaration to fix toJsxRuntime return type
declare module "hast-util-to-jsx-runtime" {
  export function toJsxRuntime(tree: HastParents, options: unknown): JSX.Element;
}

// Test component registry
const BasicButton = (props: {
  buttonText?: string;
  variant?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <button className={`btn ${props.variant ?? "default"}`} disabled={props.disabled}>
      {props.buttonText || props.children}
    </button>
  );
};

const Alert = (props: { message?: string; type?: string; children?: React.ReactNode }) => {
  return <div className={`alert alert-${props.type ?? "info"}`}>{props.message || props.children}</div>;
};

const Card = (props: { title?: string; children?: React.ReactNode }) => {
  return (
    <div className="card">
      {props.title && <h3>{props.title}</h3>}
      <div className="card-content">{props.children}</div>
    </div>
  );
};

const CodeBlock = (props: { language?: string; children?: React.ReactNode }) => {
  return (
    <pre className={`code-block ${props.language ? `lang-${props.language}` : ""}`}>
      <code>{props.children}</code>
    </pre>
  );
};

const testComponents = { BasicButton, Alert, Card, CodeBlock };

// Helper function to process MDX through React and get HTML output
function processMdxToReactHtml(
  mdxSource: string,
  components: Record<string, FunctionComponent> = testComponents,
  options: Parameters<typeof rehypeMdxElements>[0] = {},
): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      passThrough: ["mdxJsxFlowElement", "mdxJsxTextElement"],
    })
    .use(rehypeMdxElements, {
      allowedElements: Object.keys(components),
      ...options,
    });

  const file = new VFile();
  file.value = mdxSource;

  const tree = processor.runSync(processor.parse(file), file);

  const reactElement = toJsxRuntime(tree, {
    Fragment,
    components,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true,
  });

  return renderToString(reactElement as React.ReactElement);
}

describe("rehypeMdxElements React Integration Tests", () => {
  it("renders basic MDX components through React", () => {
    const mdxSource = `# Hello World

<BasicButton buttonText="Click me!" variant="primary" />

This is a paragraph with an <BasicButton buttonText="inline button" variant="secondary" disabled /> component.`;

    const html = processMdxToReactHtml(mdxSource);

    expect(html).toBe(`<h1>Hello World</h1>
<button class="btn primary">Click me!</button>
<p>This is a paragraph with an <button class="btn secondary" disabled="">inline button</button> component.</p>`);
  });

  it("renders nested components with children", () => {
    const mdxSource = `<Card title="Success!">
The MDX pipeline is working perfectly!
</Card>`;

    const html = processMdxToReactHtml(mdxSource);

    expect(html).toBe(
      `<div class="card"><h3>Success!</h3><div class="card-content"><p>The MDX pipeline is working perfectly!</p></div></div>`,
    );
  });

  it("handles components with message props vs children", () => {
    const mdxSource = `<Alert message="This is a warning message!" type="warning" />

<Alert type="info">
This alert uses children instead of message prop.
</Alert>`;

    const html = processMdxToReactHtml(mdxSource);

    expect(html).toBe(`<div class="alert alert-warning">This is a warning message!</div>
<div class="alert alert-info"><p>This alert uses children instead of message prop.</p></div>`);
  });

  it("filters out disallowed components", () => {
    const mdxSource = `<BasicButton buttonText="Safe button" />
<script>alert("XSS!")</script>
<Alert message="Safe alert" />`;

    const html = processMdxToReactHtml(mdxSource, testComponents, {
      disallowedElements: ["script"],
    });

    expect(html).toBe(`<button class="btn default">Safe button</button>
<p></p>
<div class="alert alert-info">Safe alert</div>`);
  });

  it("only allows specified components", () => {
    const mdxSource = `<BasicButton buttonText="Allowed" />
<Alert message="Not allowed" />
<Card title="Also not allowed">Content</Card>`;

    const html = processMdxToReactHtml(mdxSource, testComponents, {
      allowedElements: ["BasicButton"],
    });

    expect(html).toBe(`<button class="btn default">Allowed</button>
<!-- -->
<p></p>`);
  });

  it("renders complex nested structure", () => {
    const mdxSource = `# React + MDX Pipeline

<Card title="Nested Components">
<BasicButton buttonText="Button inside card" variant="primary" />

Some **bold text** in the card.

<Alert type="success">Alert inside card</Alert>
</Card>`;

    const html = processMdxToReactHtml(mdxSource);

    expect(html).toBe(`<h1>React + MDX Pipeline</h1>
<div class="card"><h3>Nested Components</h3><div class="card-content"><button class="btn primary">Button inside card</button><p>Some <strong>bold text</strong> in the card.</p><p><div class="alert alert-success">Alert inside card</div></p></div></div>`);
  });

  it("preserves markdown formatting within components", () => {
    const mdxSource = `<Alert type="info">
This alert contains **bold text**, _italic text_, and a [link](https://example.com).

- List item 1
- List item 2

\`inline code\`
</Alert>`;

    const html = processMdxToReactHtml(mdxSource);

    expect(html).toContain('<div class="alert alert-info">');
    expect(html).toContain("<strong>bold text</strong>");
    expect(html).toContain("<em>italic text</em>");
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>List item 1</li>");
    expect(html).toContain("<code>inline code</code>");
  });

  it("handles boolean attributes correctly", () => {
    const mdxSource = `<BasicButton buttonText="Disabled button" disabled />
<BasicButton buttonText="Enabled button" />`;

    const html = processMdxToReactHtml(mdxSource);

    expect(html).toBe(`<button class="btn default" disabled="">Disabled button</button>
<button class="btn default">Enabled button</button>`);
  });

  it("renders self-closing and regular tags", () => {
    const mdxSource = `<Alert message="Self-closing" type="warning" />

<Card title="Regular tag">
  <BasicButton buttonText="Inside card" />
</Card>`;

    const html = processMdxToReactHtml(mdxSource);

    expect(html).toBe(`<div class="alert alert-warning">Self-closing</div>
<div class="card"><h3>Regular tag</h3><div class="card-content"><button class="btn default">Inside card</button></div></div>`);
  });
});
