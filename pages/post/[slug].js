import React from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import format from 'date-fns/format';
import marked from 'marked';
import hl from 'highlight.js';

export function unstable_getStaticPaths() {
  const postsDirectory = path.resolve(process.cwd(), '_posts');
  return fs.readdirSync(postsDirectory).map(fileName => {
    const fullPath = path.join(postsDirectory, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');
    const {
      data: { slug },
    } = matter(content);
    return { params: { slug } };
  });
}

export function unstable_getStaticProps({ params }) {
  const { slug } = params;

  const postsDirectory = path.resolve(process.cwd(), '_posts');
  const { title, date, content } = fs
    .readdirSync(postsDirectory)
    .map(fileName => {
      const fullPath = path.join(postsDirectory, fileName);
      const bytes = fs.readFileSync(fullPath, 'utf8');
      const {
        data: { slug, title, date },
        content,
      } = matter(bytes);
      return { slug, title, date, content };
    })
    .find(({ slug: s }) => s === slug);

  return {
    props: {
      slug,
      title,
      date,
      html: marked(content, {
        highlight: function(code, lang) {
          return hl.highlight(lang, code).value;
        },
      }),
    },
  };
}

export default function Post({ slug, title, date, html }) {
  return (
    <main className="page-content" aria-label="Content">
      <div className="wrapper">
        <article className="post h-entry">
          <header className="post-header">
            <h1 className="post-title p-name" itemProp="name headline">
              {title}
            </h1>
            <p className="post-meta">
              <time
                className="dt-published"
                dateTime={date}
                itemProp="datePublished"
              >
                {format(new Date(date), 'MMM d, yyyy')}
              </time>
            </p>
          </header>

          <div
            className="post-content e-content"
            itemProp="articleBody"
            dangerouslySetInnerHTML={{ __html: html }}
          ></div>

          <a className="u-url" href={`/post/${slug}`} hidden></a>
        </article>
      </div>
    </main>
  );
}
