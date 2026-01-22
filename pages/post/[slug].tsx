import { format } from 'date-fns';
import hljs from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import Head from 'next/head';
import Link from 'next/link';
import React from 'react';
import { getPosts } from '../../utils/posts';

const marked = new Marked(
  markedHighlight({
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return code;
    },
  })
);

type PostProps = {
  slug: string;
  title: string;
  date: string;
  lastEdited?: string;
  html: string;
};

export const getStaticPaths = () => ({
  paths: getPosts().map((p) => `/post/${p.slug}`),
  fallback: false,
});

export function getStaticProps({ params }: { params: { slug: string } }): {
  props: PostProps;
} {
  const { slug } = params;

  const post = getPosts().find((p) => p.slug === slug)!;
  const { title, date, lastEdited, content } = post;
  return {
    props: {
      slug,
      title,
      date,
      lastEdited,
      html: marked.parse(content) as string,
    },
  };
}

export default function Post(props: PostProps) {
  const { slug, title, date, lastEdited, html } = props;
  return (
    <main className="page-content" aria-label="Content">
      <div className="wrapper">
        <article className="post h-entry">
          <header className="post-header">
            <Head>
              <title>{title}</title>
            </Head>
            <Link href="/">&laquo; Back</Link>
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
              {lastEdited && (
                <span style={{ color: '#828282' }}>
                  {' '}
                  (Updated:{' '}
                  <time dateTime={lastEdited}>
                    {format(new Date(lastEdited), 'MMM d, yyyy')}
                  </time>
                  )
                </span>
              )}
            </p>
          </header>

          <div
            className="post-content e-content"
            itemProp="articleBody"
            dangerouslySetInnerHTML={{ __html: html }}
          ></div>

          <a className="u-url" href={`/post/${slug}`} hidden></a>

          <footer className="site-footer">
            <Link href="/">&laquo; Back</Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
