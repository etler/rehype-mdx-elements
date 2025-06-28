import type { Parents as HastParents, Properties } from "hast";
import type {} from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin to convert MDX JSX element nodes to regular elements that can be handled by component mapping
 *
 * @param options - Configuration options
 * @param options.allowedElements - Array of allowed component names. If provided, only these components will be allowed. Case insensitive.
 * @param options.disallowedElements - Array of disallowed component names. These components will be removed. Case insensitive.
 *
 * @returns A unified transformer function
 *
 * @example
 * ```js
 * const processor = unified()
 *   .use(remarkParse)
 *   .use(remarkMdx)
 *   .use(remarkRehype)
 *
 * // Only allow specific components
 * processor.use(rehypeMdxElements, {
 *   allowedElements: ['Button', 'Card', 'Alert']
 * })
 *
 * // Disallow dangerous components
 * processor.use(rehypeMdxElements, {
 *   disallowedElements: ['script', 'iframe']
 * })
 * ```
 */
export function rehypeMdxElements({
  allowedElements,
  disallowedElements,
}: {
  allowedElements?: string[];
  disallowedElements?: string[];
} = {}) {
  return function (tree: HastParents): void {
    visit(tree, (node, index, parent) => {
      switch (node.type) {
        // Convert MDX elements to hast elements
        case "mdxJsxFlowElement":
        case "mdxJsxTextElement":
          {
            const { name: tagName, attributes, children } = node;

            // If allowedElements is defined, only allow elements in the list
            const isAllowed = allowedElements ? lowerCaseIncludes(allowedElements, tagName) : true;
            // If disallowedElements is defined, only disallow elements in the list
            const isDisallowed = disallowedElements ? lowerCaseIncludes(disallowedElements, tagName) : false;
            // Skip components without names or banned elements
            if (tagName == null || !isAllowed || isDisallowed) {
              if (parent && index !== undefined) {
                parent.children.splice(index, 1);
                return index;
              } else {
                return;
              }
            }

            // Convert MDX attributes to properties
            const properties: Properties = Object.fromEntries(
              attributes
                // Filter to only allow named attribute
                .flatMap((attribute) => (attribute.type === "mdxJsxAttribute" ? attribute : []))
                // Map attributes to properties and filter out attribute value expressions
                .flatMap(({ name, value }): [string, string | true][] => {
                  if (value == null || typeof value === "string") {
                    return [[name, value ?? true]];
                  } else {
                    return [];
                  }
                }),
            );

            // Replace the MDX node with hast element node
            if (parent && index !== undefined) {
              parent.children[index] = {
                type: "element",
                tagName,
                properties,
                children,
              };
            }
          }
          return;
        default:
          return;
      }
    });
  };
}

function lowerCaseIncludes(list: string[], check: string | null) {
  return list.map((item) => item.toLowerCase()).includes((check ?? "").toLowerCase());
}
