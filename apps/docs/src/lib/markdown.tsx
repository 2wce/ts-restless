import type { ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import { InstallTabs } from './InstallTabs';
import { asMarkdown } from 'fumadocs-core/server';

const childrenOnly = ({ children }: { children?: ReactNode }) => {
  asMarkdown();
  return children;
};

// Presentation wrappers retain every alternative and warning in text exports.
export const markdownComponents: MDXComponents = {
  InstallTabs,
  Tabs: childrenOnly,
  Tab: ({ value, children }: { value: string; children?: ReactNode }) => {
    asMarkdown();
    return (
      <>
        {`\n### ${value}\n\n`}
        {children}
      </>
    );
  },
  Callout: ({
    type,
    title,
    children,
  }: {
    type?: string;
    title?: string;
    children?: ReactNode;
  }) => {
    asMarkdown();
    return (
      <>
        {`\n**${title ?? type ?? 'Note'}:**\n\n`}
        {children}
        {'\n'}
      </>
    );
  },
  Steps: childrenOnly,
  Step: childrenOnly,
  Files: childrenOnly,
  Folder: ({ name, children }: { name: string; children?: ReactNode }) => {
    asMarkdown();
    return (
      <>
        {`\n${name}/\n`}
        {children}
      </>
    );
  },
  File: ({ name }: { name: string }) => {
    asMarkdown();
    return <>{`\n- ${name}\n`}</>;
  },
};
