import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { asMarkdown } from 'fumadocs-core/server';

export const InstallTabs = ({ packageName }: { packageName: string }) => {
  const packages = packageName
    .trim()
    .split(/\s+/)
    .map((name) =>
      /^@ts-restless\/[^@]+$/.test(name) ? `${name}@alpha` : name,
    )
    .join(' ');
  const notice = (
    <p>
      Install numbered prereleases from their explicit channel. Development
      examples may include changes absent from the published version; check the{' '}
      <a href="/ts-restless-migration">migration guide</a> and{' '}
      <a href="https://github.com/2wce/ts-restless/releases">release notes</a>{' '}
      for a containing release. The historical 0.0.0-stage placeholders contain
      no library code and must not be installed.
    </p>
  );
  if (asMarkdown()) {
    return (
      <>
        {notice}
        <pre>
          <code className="language-bash">{`pnpm add ${packages}\nbun add ${packages}\nnpm install ${packages}`}</code>
        </pre>
      </>
    );
  }
  return (
    <>
      {notice}
      <Tabs items={['pnpm', 'bun', 'npm']} groupId="install" persist>
        <Tab value="pnpm" title="pnpm">
          <DynamicCodeBlock lang="bash" code={`pnpm add ${packages}`} />
        </Tab>
        <Tab value="bun" title="bun">
          <DynamicCodeBlock lang="bash" code={`bun add ${packages}`} />
        </Tab>
        <Tab value="npm" title="npm">
          <DynamicCodeBlock lang="bash" code={`npm install ${packages}`} />
        </Tab>
      </Tabs>
    </>
  );
};
