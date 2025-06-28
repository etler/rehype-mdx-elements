import { describe, expect, it } from "vitest";
import type { ElementContent, Parents as HastParents } from "hast";
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElementHast,
  MdxJsxTextElementHast,
} from "mdast-util-mdx-jsx";
import { rehypeMdxElements } from "@/index";

const createMdxJsxFlowElement = (
  name: string | null,
  attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[] = [],
  children: ElementContent[] = [],
): MdxJsxFlowElementHast => ({
  type: "mdxJsxFlowElement",
  name,
  attributes,
  children,
});

const createMdxJsxTextElement = (
  name: string | null,
  attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[] = [],
  children: ElementContent[] = [],
): MdxJsxTextElementHast => ({
  type: "mdxJsxTextElement" as const,
  name,
  attributes,
  children,
});

const createMdxJsxAttribute = (name: string, value?: string | null): MdxJsxAttribute => ({
  type: "mdxJsxAttribute" as const,
  name,
  value,
});

const createMdxJsxExpressionAttribute = (value: string): MdxJsxExpressionAttribute => ({
  type: "mdxJsxExpressionAttribute" as const,
  value,
});

describe("rehypeMdxElements", () => {
  describe("basic conversion", () => {
    it("converts mdxJsxFlowElement to hast element", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement(
            "Button",
            [createMdxJsxAttribute("className", "primary")],
            [{ type: "text", value: "Click me" }],
          ),
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      expect(tree.children[0]).toEqual({
        type: "element",
        tagName: "Button",
        properties: {
          className: "primary",
        },
        children: [{ type: "text", value: "Click me" }],
      });
    });

    it("converts mdxJsxTextElement to hast element", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxTextElement(
            "span",
            [createMdxJsxAttribute("id", "test")],
            [{ type: "text", value: "inline text" }],
          ),
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      expect(tree.children[0]).toEqual({
        type: "element",
        tagName: "span",
        properties: {
          id: "test",
        },
        children: [{ type: "text", value: "inline text" }],
      });
    });
  });

  describe("attribute handling", () => {
    it("converts named attributes to properties", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("div", [
            createMdxJsxAttribute("className", "container"),
            createMdxJsxAttribute("id", "main"),
            createMdxJsxAttribute("role", "banner"),
          ]),
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      const [element] = tree.children;
      expect(element).toMatchObject({
        type: "element",
        properties: {
          className: "container",
          id: "main",
          role: "banner",
        },
      });
    });

    it("handles boolean attributes (no value)", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("input", [createMdxJsxAttribute("disabled"), createMdxJsxAttribute("required")]),
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      const [element] = tree.children;
      expect(element).toMatchObject({
        type: "element",
        properties: {
          disabled: true,
          required: true,
        },
      });
    });

    it("filters out expression attributes", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("div", [
            createMdxJsxAttribute("className", "static"),
            createMdxJsxExpressionAttribute("onClick={handleClick}"),
            createMdxJsxAttribute("id", "test"),
          ]),
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      const [element] = tree.children;
      expect(element).toMatchObject({
        type: "element",
        properties: {
          className: "static",
          id: "test",
        },
      });
    });

    it("handles attributes with null values", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("input", [
            createMdxJsxAttribute("value", null),
            createMdxJsxAttribute("placeholder", "Enter text"),
          ]),
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      const [element] = tree.children;
      expect(element).toMatchObject({
        type: "element",
        properties: {
          value: true,
          placeholder: "Enter text",
        },
      });
    });
  });

  describe("allowedElements option", () => {
    it("only allows specified elements", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("Button"),
          createMdxJsxFlowElement("Card"),
          createMdxJsxFlowElement("Script"),
        ],
      };

      const transform = rehypeMdxElements({
        allowedElements: ["Button", "Card"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(2);
      expect(tree.children[0]).toMatchObject({ type: "element", tagName: "Button" });
      expect(tree.children[1]).toMatchObject({ type: "element", tagName: "Card" });
    });

    it("is case insensitive for allowed elements", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("button"),
          createMdxJsxFlowElement("CARD"),
          createMdxJsxFlowElement("Alert"),
        ],
      };

      const transform = rehypeMdxElements({
        allowedElements: ["Button", "Card"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(2);
      expect(tree.children[0]).toMatchObject({ type: "element", tagName: "button" });
      expect(tree.children[1]).toMatchObject({ type: "element", tagName: "CARD" });
    });

    it("removes elements not in allowedElements list", () => {
      const tree: HastParents = {
        type: "root",
        children: [createMdxJsxFlowElement("AllowedComponent"), createMdxJsxFlowElement("DisallowedComponent")],
      };

      const transform = rehypeMdxElements({
        allowedElements: ["AllowedComponent"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({ type: "element", tagName: "AllowedComponent" });
    });
  });

  describe("disallowedElements option", () => {
    it("removes specified disallowed elements", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("Button"),
          createMdxJsxFlowElement("script"),
          createMdxJsxFlowElement("Card"),
        ],
      };

      const transform = rehypeMdxElements({
        disallowedElements: ["script", "iframe"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(2);
      expect(tree.children[0]).toMatchObject({ type: "element", tagName: "Button" });
      expect(tree.children[1]).toMatchObject({ type: "element", tagName: "Card" });
    });

    it("is case insensitive for disallowed elements", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("Button"),
          createMdxJsxFlowElement("SCRIPT"),
          createMdxJsxFlowElement("iframe"),
        ],
      };

      const transform = rehypeMdxElements({
        disallowedElements: ["script", "IFRAME"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({ type: "element", tagName: "Button" });
    });
  });

  describe("edge cases", () => {
    it("removes elements without names", () => {
      const tree: HastParents = {
        type: "root",
        children: [createMdxJsxFlowElement(null), createMdxJsxFlowElement("ValidComponent")],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      expect(tree.children).toHaveLength(1);
      expect(tree.children[0]).toMatchObject({ type: "element", tagName: "ValidComponent" });
    });

    it("handles empty tree", () => {
      const tree: HastParents = {
        type: "root",
        children: [],
      };

      const transform = rehypeMdxElements();
      expect(() => {
        transform(tree);
      }).not.toThrow();
      expect(tree.children).toHaveLength(0);
    });

    it("preserves non-MDX nodes", () => {
      const textNode = { type: "text" as const, value: "Hello" };
      const elementNode = {
        type: "element" as const,
        tagName: "p",
        properties: {},
        children: [],
      };

      const tree: HastParents = {
        type: "root",
        children: [textNode, elementNode, createMdxJsxFlowElement("Button")],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      expect(tree.children).toHaveLength(3);
      expect(tree.children[0]).toBe(textNode);
      expect(tree.children[1]).toBe(elementNode);
      expect(tree.children[2]).toMatchObject({ type: "element", tagName: "Button" });
    });

    it("handles nested structures", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "div",
            properties: {},
            children: [createMdxJsxFlowElement("Button", [createMdxJsxAttribute("type", "submit")])],
          },
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      const [divElement] = tree.children;
      expect(divElement).toMatchObject({
        type: "element",
        tagName: "div",
        children: [
          {
            type: "element",
            tagName: "Button",
            properties: { type: "submit" },
          },
        ],
      });
    });
  });

  describe("combined options", () => {
    it("respects both allowedElements and disallowedElements", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement("Button"),
          createMdxJsxFlowElement("Card"),
          createMdxJsxFlowElement("script"),
          createMdxJsxFlowElement("UnknownComponent"),
        ],
      };

      const transform = rehypeMdxElements({
        allowedElements: ["Button", "Card", "script"],
        disallowedElements: ["script"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(2);
      expect(tree.children[0]).toMatchObject({ type: "element", tagName: "Button" });
      expect(tree.children[1]).toMatchObject({ type: "element", tagName: "Card" });
    });

    it("prioritizes disallowedElements over allowedElements", () => {
      const tree: HastParents = {
        type: "root",
        children: [createMdxJsxFlowElement("DangerousComponent")],
      };

      const transform = rehypeMdxElements({
        allowedElements: ["DangerousComponent"],
        disallowedElements: ["DangerousComponent"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(0);
    });
  });

  describe("integration scenarios", () => {
    it("processes complex MDX component with multiple attributes", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          createMdxJsxFlowElement(
            "CustomCard",
            [
              createMdxJsxAttribute("title", "My Card"),
              createMdxJsxAttribute("variant", "outlined"),
              createMdxJsxAttribute("elevated"),
              createMdxJsxExpressionAttribute("onClick={handleClick}"),
              createMdxJsxAttribute("data-testid", "card-1"),
            ],
            [{ type: "text", value: "Card content here" }],
          ),
        ],
      };

      const transform = rehypeMdxElements();
      transform(tree);

      const [element] = tree.children;
      expect(element).toEqual({
        type: "element",
        tagName: "CustomCard",
        properties: {
          "title": "My Card",
          "variant": "outlined",
          "elevated": true,
          "data-testid": "card-1",
        },
        children: [{ type: "text", value: "Card content here" }],
      });
    });

    it("handles mixed content with filtering", () => {
      const tree: HastParents = {
        type: "root",
        children: [
          { type: "text", value: "Start text" },
          createMdxJsxTextElement("SafeComponent", [createMdxJsxAttribute("prop", "value")]),
          createMdxJsxFlowElement("UnsafeComponent"),
          { type: "text", value: "End text" },
        ],
      };

      const transform = rehypeMdxElements({
        allowedElements: ["SafeComponent"],
      });
      transform(tree);

      expect(tree.children).toHaveLength(3);
      expect(tree.children[0]).toEqual({ type: "text", value: "Start text" });
      expect(tree.children[1]).toMatchObject({ type: "element", tagName: "SafeComponent" });
      expect(tree.children[2]).toEqual({ type: "text", value: "End text" });
    });
  });
});
